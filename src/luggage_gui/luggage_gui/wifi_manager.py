#!/usr/bin/env python3
# Developed by Humynex Robotics - We make your ideas into reality
# Email: humynexrobotics@gmail.com
# Phone: 8714358646

import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import subprocess
import json
import socket

class WifiManager(Node):
    def __init__(self):
        super().__init__('wifi_manager')
        
        self.status_pub = self.create_publisher(String, '/gui/wifi_status', 10)
        self.create_subscription(String, '/gui/wifi_command', self.cmd_callback, 10)
        
        # FIX: Store the last scanned networks so they don't disappear!
        self.last_networks = []
        
        self.timer = self.create_timer(5.0, self.publish_status)
        self.get_logger().info("📶 WiFi Manager ONLINE.")

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

    def get_current_network(self):
        try:
            res = subprocess.check_output(['nmcli', '-t', '-f', 'ACTIVE,SSID', 'dev', 'wifi']).decode('utf-8')
            for line in res.split('\n'):
                if line.startswith('yes:'):
                    return line.split(':')[1]
        except:
            pass
        return "Disconnected"

    def scan_networks(self):
        networks = []
        try:
            res = subprocess.check_output(['nmcli', '-t', '-f', 'SSID,SIGNAL,SECURITY', 'dev', 'wifi']).decode('utf-8')
            seen = set()
            for line in res.split('\n'):
                if line and ':' in line:
                    parts = line.split(':')
                    ssid = parts[0]
                    if ssid and ssid not in seen:
                        seen.add(ssid)
                        networks.append({
                            'ssid': ssid,
                            'signal': int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 0,
                            'secured': len(parts) > 2 and parts[2] != ''
                        })
        except:
            pass
        
        # Save them so they stay on the React screen
        self.last_networks = sorted(networks, key=lambda x: x['signal'], reverse=True)
        return self.last_networks

    def publish_status(self, scan=False):
        if scan:
            self.scan_networks()
            
        status = {
            'ip': self.get_ip_address(),
            'current': self.get_current_network(),
            'networks': self.last_networks  # ALWAYS send the list, even if not scanning right now
        }
        msg = String()
        msg.data = json.dumps(status)
        self.status_pub.publish(msg)

    def cmd_callback(self, msg):
        cmd = msg.data
        if cmd == 'SCAN':
            self.publish_status(scan=True)
        elif cmd.startswith('CONNECT|'):
            parts = cmd.split('|')
            if len(parts) == 3:
                ssid = parts[1]
                password = parts[2]
                self.get_logger().info(f"Attempting to connect to {ssid}...")
                try:
                    subprocess.Popen(['nmcli', 'dev', 'wifi', 'connect', ssid, 'password', password])
                except Exception as e:
                    self.get_logger().error(f"WiFi Connect Error: {e}")

def main(args=None):
    rclpy.init(args=args)
    node = WifiManager()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()