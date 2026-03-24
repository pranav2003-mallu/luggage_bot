# Developed by Humynex Robotics - We make your ideas into reality
# Email: humynexrobotics@gmail.com
# Phone: 8714358646

#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
from geometry_msgs.msg import PoseWithCovarianceStamped
import subprocess
import os
import signal
import time
import json
import socket

class SystemManager(Node):
    def __init__(self):
        super().__init__('system_manager')
        
        self.cmd_sub = self.create_subscription(String, '/gui/system_command', self.command_callback, 10)
        self.initial_pose_pub = self.create_publisher(PoseWithCovarianceStamped, '/initialpose', 10)
        self.telemetry_pub = self.create_publisher(String, '/gui/system_telemetry', 10)
        
        # --- GLOBAL STATE SYNCHRONIZER ---
        self.state_sub = self.create_subscription(String, '/gui/state_update', self.state_update_callback, 10)
        self.global_state_pub = self.create_publisher(String, '/gui/global_state', 10)
        
        self.global_state = {
            "current_path": "/",
            "system_status": "idle",
            "dev_mode": False,
            "theme": "dark"
        }
        # ---------------------------------
        
        self.active_processes = []
        self.robot_ip = self.get_ip_address()
        
        self.timer = self.create_timer(2.0, self.publish_telemetry) 
        self.state_timer = self.create_timer(0.1, self.publish_global_state) # Upgraded to 10Hz for smoother progress bar mirroring!
        
        self.get_logger().info("✅ Humynex OS System Manager is ONLINE.")

    def get_ip_address(self):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.settimeout(0)
            s.connect(('8.8.8.8', 1))
            ip = s.getsockname()[0]
        except Exception:
            ip = '127.0.0.1'
        finally:
            s.close()
        return ip

    def state_update_callback(self, msg):
        """Receives any state update from ANY client and forces it into the Master State"""
        try:
            new_state = json.loads(msg.data)
            for key, value in new_state.items():
                # BUG FIX: Removed the strict filter. Now ANY variable can be mirrored instantly!
                self.global_state[key] = value
        except Exception as e:
            self.get_logger().error(f"State Update Error: {e}")

    def publish_global_state(self):
        """Broadcasts the Master State to ALL clients"""
        msg = String()
        msg.data = json.dumps(self.global_state)
        self.global_state_pub.publish(msg)

    def publish_telemetry(self):
        pico_connected = os.path.exists('/dev/ttyACM0') or os.path.exists('/dev/ttyACM1')
        lidar_connected = os.path.exists('/dev/ttyUSB0') or os.path.exists('/dev/ttyUSB1')
        
        external_ips = set()
        try:
            netstat = subprocess.check_output(['ss', '-tn', 'state', 'established', '( dport = :9090 or sport = :9090 )']).decode('utf-8')
            for line in netstat.split('\n'):
                if not line.strip() or 'State' in line: 
                    continue
                parts = line.split()
                if len(parts) >= 5:
                    peer_addr = parts[4].rsplit(':', 1)[0]
                    if peer_addr not in ['127.0.0.1', '::1', '[::1]', self.robot_ip]:
                        external_ips.add(peer_addr)
        except Exception:
            pass

        telemetry = {
            'pico_connected': pico_connected,
            'lidar_connected': lidar_connected,
            'external_clients': len(external_ips),
            'connected_ips': list(external_ips)
        }
        
        msg = String()
        msg.data = json.dumps(telemetry)
        self.telemetry_pub.publish(msg)

    def command_callback(self, msg):
        command = msg.data
        self.get_logger().info(f"Received GUI Command: {command}")

        if command in ['LAUNCH_SIM', 'LAUNCH_HW', 'LAUNCH_MAPPING'] or command.startswith('LAUNCH_NAV'):
            self.global_state["system_status"] = "running"
        elif command == 'KILL':
            self.global_state["system_status"] = "idle"
            self.kill_all_processes()

        if command == 'LAUNCH_SIM':
            self.start_process(["ros2", "launch", "luggage_description", "teleop_rviz.launch.py"])
        elif command == 'LAUNCH_HW':
            self.start_process(["ros2", "launch", "luggage_description", "teleop_hardware.launch.py"])
        elif command == 'LAUNCH_MAPPING':
            self.start_process(["ros2", "launch", "luggage_description", "mapping.launch.py"])
        elif command.startswith('LAUNCH_NAV'):
            parts = command.split('|')
            map_name = parts[1] if len(parts) > 1 else "default_map"
            safe_map_name = map_name.replace(' ', '_').lower()
            map_path = f"/home/{os.environ.get('USER')}/maps/{safe_map_name}.yaml" 
            self.start_process(["ros2", "launch", "luggage_description", "navigation.launch.py", f"map:={map_path}"])
        elif command == 'LOCALIZE_GLOBAL':
            subprocess.Popen(["ros2", "service", "call", "/reinitialize_global_localization", "std_srvs/srv/Empty"])
        elif command == 'SET_HOME_POSE':
            pose_msg = PoseWithCovarianceStamped()
            pose_msg.header.frame_id = "map"
            pose_msg.header.stamp = self.get_clock().now().to_msg()
            pose_msg.pose.pose.orientation.w = 1.0 
            self.initial_pose_pub.publish(pose_msg)

        elif command == 'SHUTDOWN_SOFTWARE':
            self.get_logger().warn("⚠️ EXECUTING MASTER SOFTWARE HALT...")
            self.kill_all_processes()
            time.sleep(0.5)
            os.killpg(os.getpgrp(), signal.SIGINT)

        elif command == 'SHUTDOWN_HARDWARE':
            self.get_logger().warn("🚨 FULL HARDWARE POWER OFF INITIATED...")
            self.kill_all_processes()
            time.sleep(0.5)
            os.system("sudo poweroff")

    def start_process(self, cmd_list):
        try:
            proc = subprocess.Popen(cmd_list, preexec_fn=os.setsid)
            self.active_processes.append(proc)
        except Exception as e:
            self.get_logger().error(f"Failed to start process: {e}")

    def kill_all_processes(self):
        for proc in self.active_processes:
            try:
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
                proc.wait(timeout=5)
            except Exception:
                pass
        self.active_processes.clear()

def main(args=None):
    rclpy.init(args=args)
    manager = SystemManager()
    try:
        rclpy.spin(manager)
    except KeyboardInterrupt:
        pass
    finally:
        manager.kill_all_processes()
        manager.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()