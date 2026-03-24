# Developed by Humynex Robotics - We make your ideas into reality
# Email: humynexrobotics@gmail.com
# Phone: 8714358646

import os

from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch_ros.actions import Node
from launch.substitutions import Command
from launch_ros.parameter_descriptions import ParameterValue


def generate_launch_description():

    pkg_share = get_package_share_directory('luggage_description')

    xacro_file = os.path.join(pkg_share, 'urdf', 'luggage.xacro')

    robot_desc = ParameterValue(
        Command(['xacro ', xacro_file]),
        value_type=str
    )

    return LaunchDescription([

        # Robot State Publisher 
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

        # Joint State Publisher 
        Node(
            package='joint_state_publisher',
            executable='joint_state_publisher',
            parameters=[{'robot_description': robot_desc}],
            output='screen'
        ),

        # STATIC TRANSFORM: base_footprint → base_link ONLY
        # (We deleted the odom->base_footprint one so fake_odom can take over)
        Node(
            package='tf2_ros',
            executable='static_transform_publisher',
            arguments=['0','0','0','0','0','0','base_footprint','base_link']
        ),

        # Fake Odom (Now handles the dynamic odom->base_footprint)
        Node(
            package='luggage_description',
            executable='fake_odom.py',
            output='screen'
        ),  

    ])
