# Developed by Humynex Robotics - We make your ideas into reality
# Email: humynexrobotics@gmail.com
# Phone: 8714358646

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import PoseStamped
from tf2_ros import TransformException
from tf2_ros.buffer import Buffer
from tf2_ros.transform_listener import TransformListener

class PoseTracker(Node):
    def __init__(self):
        super().__init__('pose_tracker')
        # We publish a highly stable, simple pose message at 30Hz for smooth web rendering
        self.publisher = self.create_publisher(PoseStamped, '/gui/robot_pose', 10)
        self.tf_buffer = Buffer()
        self.tf_listener = TransformListener(self.tf_buffer, self)
        self.timer = self.create_timer(0.033, self.publish_pose) 

    def publish_pose(self):
        try:
            # Automatically detect if we are in Mapping (map) or Free Drive (odom)
            from_frame = 'map'
            if not self.tf_buffer.can_transform('map', 'base_footprint', rclpy.time.Time()):
                from_frame = 'odom'
            
            t = self.tf_buffer.lookup_transform(from_frame, 'base_footprint', rclpy.time.Time())
            
            msg = PoseStamped()
            msg.header.stamp = self.get_clock().now().to_msg()
            msg.header.frame_id = from_frame
            msg.pose.position.x = t.transform.translation.x
            msg.pose.position.y = t.transform.translation.y
            msg.pose.position.z = t.transform.translation.z
            msg.pose.orientation = t.transform.rotation
            
            self.publisher.publish(msg)
        except TransformException:
            pass # Stay silent and wait for the robot to boot

def main():
    rclpy.init()
    node = PoseTracker()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()