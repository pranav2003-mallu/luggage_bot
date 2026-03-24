#!/usr/bin/env python3
# Developed by Humynex Robotics - We make your ideas into reality
# Email: humynexrobotics@gmail.com
# Phone: 8714358646

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist, TransformStamped
from nav_msgs.msg import Odometry
import serial
import math
from tf2_ros import TransformBroadcaster
from rcl_interfaces.msg import SetParametersResult

class NanoBridge(Node):
    def __init__(self):
        super().__init__('nano_bridge')
        
        # ==========================================
        # ⚠️ HARDWARE TUNING THRESHOLDS ⚠️
        # ==========================================
        self.WHEEL_RADIUS = 0.085  # Meters (Adjust to real wheel)
        self.WHEEL_BASE = 0.254    # Meters (Distance between wheels)
        self.TICKS_PER_REV = 330.0 # Encoder ticks per revolution
        self.PID_RATE = 30.0       # Hz (Must match Nano firmware)
        
        self.KP = 20
        self.KD = 12
        self.KI = 0
        self.KO = 50
        # ==========================================

        # GUI-Editable Parameters
        self.declare_parameter('port_name', '/dev/ttyUSB0')
        self.declare_parameter('baud_rate', 115200)
        self.port_name = self.get_parameter('port_name').value
        self.baud_rate = self.get_parameter('baud_rate').value

        # Listen for GUI Parameter Changes
        self.add_on_set_parameters_callback(self.parameter_callback)

        self.ser = None
        self.connect_serial()
        self.send_command(f"u {self.KP}:{self.KD}:{self.KI}:{self.KO}\r")

        # ROS 2 Interfaces
        self.create_subscription(Twist, '/cmd_vel', self.cmd_cb, 10)
        self.odom_pub = self.create_publisher(Odometry, '/odom', 10)
        self.tf_broadcaster = TransformBroadcaster(self)
        
        self.x = 0.0
        self.y = 0.0
        self.th = 0.0
        self.left_ticks_prev = 0
        self.right_ticks_prev = 0
        self.last_time = self.get_clock().now()

        # Odometry Request Loop
        self.create_timer(1.0 / self.PID_RATE, self.odom_loop)
        self.get_logger().info(f"✅ Nano Bridge Started on {self.port_name}")

    def parameter_callback(self, params):
        for param in params:
            if param.name == 'port_name':
                self.get_logger().info(f"🔄 GUI changed port to: {param.value}")
                self.port_name = param.value
                if self.ser and self.ser.is_open:
                    self.ser.close()
                self.connect_serial()
        return SetParametersResult(successful=True)

    def connect_serial(self):
        try:
            self.ser = serial.Serial(self.port_name, self.baud_rate, timeout=0.1)
            self.get_logger().info(f"🔌 Serial Connected: {self.port_name}")
        except Exception as e:
            self.get_logger().error(f"❌ Serial Failure: {e}")

    def send_command(self, cmd_str):
        if self.ser and self.ser.is_open:
            try:
                self.ser.write(cmd_str.encode('utf-8'))
            except Exception:
                pass

    def cmd_cb(self, msg):
        v = msg.linear.x
        w = msg.angular.z
        
        v_left = v - (w * self.WHEEL_BASE / 2.0)
        v_right = v + (w * self.WHEEL_BASE / 2.0)

        meters_per_tick = (2.0 * math.pi * self.WHEEL_RADIUS) / self.TICKS_PER_REV
        
        left_ticks_per_sec = v_left / meters_per_tick
        right_ticks_per_sec = v_right / meters_per_tick

        left_ticks_per_frame = int(left_ticks_per_sec / self.PID_RATE)
        right_ticks_per_frame = int(right_ticks_per_sec / self.PID_RATE)

        # Send 'm' command (MOTOR_SPEEDS)
        self.send_command(f"m {left_ticks_per_frame} {right_ticks_per_frame}\r")

    def odom_loop(self):
        if not (self.ser and self.ser.is_open):
            return

        # Send 'e' command (READ_ENCODERS)
        self.send_command("e\r")
        try:
            line = self.ser.readline().decode('utf-8').strip()
            if not line: return
            
            parts = line.split()
            if len(parts) == 2:
                self.calculate_odometry(int(parts[0]), int(parts[1]))
        except Exception:
            pass

    def calculate_odometry(self, left_ticks, right_ticks):
        current_time = self.get_clock().now()
        dt = (current_time - self.last_time).nanoseconds / 1e9

        delta_left = left_ticks - self.left_ticks_prev
        delta_right = right_ticks - self.right_ticks_prev

        self.left_ticks_prev = left_ticks
        self.right_ticks_prev = right_ticks

        meters_per_tick = (2.0 * math.pi * self.WHEEL_RADIUS) / self.TICKS_PER_REV

        d_left = delta_left * meters_per_tick
        d_right = delta_right * meters_per_tick

        d_center = (d_left + d_right) / 2.0
        d_theta = (d_right - d_left) / self.WHEEL_BASE

        if d_center != 0:
            self.x += d_center * math.cos(self.th + (d_theta / 2.0))
            self.y += d_center * math.sin(self.th + (d_theta / 2.0))
        self.th += d_theta

        v_x = d_center / dt if dt > 0 else 0.0
        v_th = d_theta / dt if dt > 0 else 0.0

        q_z = math.sin(self.th / 2.0)
        q_w = math.cos(self.th / 2.0)

        # TF Broadcast (odom -> base_footprint)
        t = TransformStamped()
        t.header.stamp = current_time.to_msg()
        t.header.frame_id = 'odom'
        t.child_frame_id = 'base_footprint'
        t.transform.translation.x = self.x
        t.transform.translation.y = self.y
        t.transform.rotation.z = q_z
        t.transform.rotation.w = q_w
        self.tf_broadcaster.sendTransform(t)

        # Odometry Message
        odom = Odometry()
        odom.header.stamp = current_time.to_msg()
        odom.header.frame_id = 'odom'
        odom.child_frame_id = 'base_footprint'
        odom.pose.pose.position.x = self.x
        odom.pose.pose.position.y = self.y
        odom.pose.pose.orientation.z = q_z
        odom.pose.pose.orientation.w = q_w
        odom.twist.twist.linear.x = v_x
        odom.twist.twist.angular.z = v_th
        self.odom_pub.publish(odom)

        self.last_time = current_time

def main():
    rclpy.init()
    node = NanoBridge()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()