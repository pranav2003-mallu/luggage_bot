#!/usr/bin/env python3
# Developed by Humynex Robotics - We make your ideas into reality
# Email: humynexrobotics@gmail.com
# Phone: 8714358646


import rclpy
import math
from rclpy.node import Node

from geometry_msgs.msg import Twist
from nav_msgs.msg import Odometry
from geometry_msgs.msg import TransformStamped

from tf2_ros import TransformBroadcaster


class FakeOdom(Node):

    def __init__(self):
        super().__init__('fake_odom')

        # Robot pose
        self.x = 0.0
        self.y = 0.0
        self.theta = 0.0

        # Velocities
        self.v = 0.0
        self.w = 0.0

        # Update rate
        self.dt = 0.05

        # Subscriber: cmd_vel
        self.create_subscription(
            Twist,
            '/cmd_vel',
            self.cmd_callback,
            10
        )

        # Publisher: odom
        self.odom_pub = self.create_publisher(
            Odometry,
            '/odom',
            10
        )

        # TF broadcaster
        self.tf_broadcaster = TransformBroadcaster(self)

        # Timer
        self.timer = self.create_timer(self.dt, self.update)

        self.get_logger().info("Fake Odom Node Started. Publishing dynamic TF.")

    def cmd_callback(self, msg):
        self.v = msg.linear.x
        self.w = msg.angular.z

    def update(self):
        # Update orientation
        self.theta += self.w * self.dt

        # Update position
        dx = self.v * math.cos(self.theta) * self.dt
        dy = self.v * math.sin(self.theta) * self.dt

        self.x += dx
        self.y += dy

        # Native math conversion from Yaw to Quaternion (No external dependencies needed)
        qz = math.sin(self.theta / 2.0)
        qw = math.cos(self.theta / 2.0)

        now = self.get_clock().now().to_msg()

        # -----------------------
        # Publish ODOM message
        # -----------------------
        odom = Odometry()
        odom.header.stamp = now
        odom.header.frame_id = "odom"
        odom.child_frame_id = "base_footprint"  # <--- CRITICAL FIX: Target base_footprint

        odom.pose.pose.position.x = self.x
        odom.pose.pose.position.y = self.y
        odom.pose.pose.position.z = 0.0

        odom.pose.pose.orientation.x = 0.0
        odom.pose.pose.orientation.y = 0.0
        odom.pose.pose.orientation.z = qz
        odom.pose.pose.orientation.w = qw

        odom.twist.twist.linear.x = self.v
        odom.twist.twist.angular.z = self.w

        self.odom_pub.publish(odom)

        # -----------------------
        # Publish TF
        # -----------------------
        t = TransformStamped()
        t.header.stamp = now
        t.header.frame_id = "odom"
        t.child_frame_id = "base_footprint"  # <--- CRITICAL FIX: Target base_footprint

        t.transform.translation.x = self.x
        t.transform.translation.y = self.y
        t.transform.translation.z = 0.0

        t.transform.rotation.x = 0.0
        t.transform.rotation.y = 0.0
        t.transform.rotation.z = qz
        t.transform.rotation.w = qw

        self.tf_broadcaster.sendTransform(t)


def main(args=None):
    rclpy.init(args=args)
    node = FakeOdom()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()


if __name__ == '__main__':
    main()