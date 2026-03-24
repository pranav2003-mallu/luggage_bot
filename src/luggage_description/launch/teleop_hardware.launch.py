# Developed by Humynex Robotics - We make your ideas into reality
# Email: humynexrobotics@gmail.com
# Phone: 8714358646

import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch_ros.actions import Node
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration, Command
from launch_ros.parameter_descriptions import ParameterValue

def generate_launch_description():
    pkg_share = get_package_share_directory('luggage_description')
    nano_port = LaunchConfiguration('nano_port')

    xacro_file = os.path.join(pkg_share, 'urdf', 'luggage.xacro')
    rviz_config = os.path.join(pkg_share, 'rviz', 'rviz.rviz')

    # Strict string typing for Jazzy URDF
    robot_desc = ParameterValue(Command(['xacro ', xacro_file]), value_type=str)

    return LaunchDescription([
        DeclareLaunchArgument('nano_port', default_value='/dev/ttyUSB0', description='Pico Serial Port'),

        # 1. Robot State Publisher (UPDATED FOR WEB BROADCAST)
        Node(
            package='robot_state_publisher',
            executable='robot_state_publisher',
            parameters=[{
                'robot_description': robot_desc,
                'publish_frequency': 30.0,
                'use_sim_time': False
            }],
            output='screen'
        ),

        # 2. Joint State Publisher
        Node(
            package='joint_state_publisher',
            executable='joint_state_publisher',
            parameters=[{'robot_description': robot_desc}],
            output='screen'
        ),

        # 3. REAL HARDWARE BRIDGE (Replaces fake_odom)
        Node(
            package='luggage_description',
            executable='nano_bridge.py',
            parameters=[{'port_name': nano_port}],
            output='screen'
        )
    ])
