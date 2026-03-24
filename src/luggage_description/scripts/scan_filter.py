# Developed by Humynex Robotics - We make your ideas into reality
# Email: humynexrobotics@gmail.com
# Phone: 8714358646

#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from sensor_msgs.msg import LaserScan
from rclpy.qos import QoSProfile, ReliabilityPolicy, HistoryPolicy

class ScanFilter(Node):
    def __init__(self):
        super().__init__('scan_filter')
        
        # --- DEFINING BEST EFFORT EXPLICITLY ---
        # This creates the "Best Effort" rule manually so you can see it.
        # It tells ROS: "If a packet is lost, don't worry, just send the next one."
        qos_policy = QoSProfile(
            reliability=ReliabilityPolicy.BEST_EFFORT,
            history=HistoryPolicy.KEEP_LAST,
            depth=10
        )

        # Input: Listen to the raw scan using Best Effort
        self.create_subscription(LaserScan, '/scan', self.scan_cb, qos_policy)
        
        # Output: Publish the filtered scan using Best Effort
        # This makes it compatible with Nav2 default settings.
        self.pub = self.create_publisher(LaserScan, '/scan_filtered', qos_policy)
        
        self.get_logger().info("✅ Scan Filter Active: /scan -> /scan_filtered (Reliability: BEST_EFFORT)")

    def scan_cb(self, msg):
        # Keep frame consistent
        msg.header.frame_id = "laser"
        
        # YOUR LOGIC (From your working mapping file)
        # You stated this worked perfectly, so we keep it exactly as is.
        new_ranges = list(msg.ranges)
        for i in range(len(new_ranges)):
            angle = msg.angle_min + (i * msg.angle_increment)
            
            # Your specific condition:
            if -1.57 < angle < 1.57: 
                new_ranges[i] = float('inf') # Mask this area
        
        msg.ranges = new_ranges
        self.pub.publish(msg)

def main():
    rclpy.init()
    rclpy.spin(ScanFilter())
    rclpy.shutdown()

if __name__ == '__main__':
    main()
