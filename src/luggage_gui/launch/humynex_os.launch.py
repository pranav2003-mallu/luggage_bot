# Developed by Humynex Robotics - We make your ideas into reality
# Email: humynexrobotics@gmail.com
# Phone: 8714358646

import os
import sys
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription, ExecuteProcess
from launch.launch_description_sources import AnyLaunchDescriptionSource
from launch_ros.actions import Node
from ament_index_python.packages import get_package_share_directory

# ==========================================================
# BRANDING & TERMINAL UI
# ==========================================================
CYAN = '\033[1;36m'
BLUE = '\033[1;34m'
GREEN = '\033[1;32m'
YELLOW = '\033[1;33m'
RESET = '\033[0m'

HUMYNEX_BANNER = fr"""{CYAN}
 _   _ _   _ __  __ __  __ _   _ _______   __
| | | | | | |  \/  |\ \/ /| \ | |  ___\ \ / /
| |_| | | | | \  / | \  / |  \| | |__  \ V / 
|  _  | |_| | |\/| | /  \ | . ` |  __|  > <  
| | | | |_| | |  | |/ /\ \| |\  | |____/ . \ 
|_| |_\___/|_|  |_/_/  \_\_| \_|_____/_/ \_\

 R  O  B  O  T  I  C  S   -   A E R O P O R T E R{RESET}
{BLUE}========================================================={RESET}
{GREEN} 🚀 System Manager: ONLINE
 🌐 Network Hub: BROADCASTING (--host enabled)
 📡 Telemetry: ACTIVE{RESET}
"""

print(HUMYNEX_BANNER)

def generate_launch_description():
    rosbridge_dir = get_package_share_directory('rosbridge_server')
    luggage_desc_dir = get_package_share_directory('luggage_description')
    
    mesh_server_root = os.path.abspath(os.path.join(luggage_desc_dir, '..'))
    workspace_root = os.path.expanduser('~/luggage_bot')
    react_app_path = os.path.join(workspace_root, 'src', 'luggage_gui', 'frontend')

    return LaunchDescription([
        # 1. ROS WebSocket Bridge (Port 9090)
        IncludeLaunchDescription(
            AnyLaunchDescriptionSource(
                os.path.join(rosbridge_dir, 'launch', 'rosbridge_websocket_launch.xml')
            )
        ),

        # 2. Humynex Direct Pose Tracker
        Node(
            package='luggage_gui',
            executable='pose_tracker',
            name='pose_tracker',
            output='screen'
        ),

        # 3. Humynex OS System Manager
        Node(
            package='luggage_gui',
            executable='system_manager',
            name='system_manager',
            output='screen'
        ),

        # 4. WiFi Manager (NEW - Added from previous phase)
        Node(
            package='luggage_gui',
            executable='wifi_manager',
            name='wifi_manager',
            output='screen'
        ),

        # 5. 3D Mesh Local Web Server (Port 8080)
        ExecuteProcess(
            cmd=['npx', 'http-server', mesh_server_root, '--cors', '-p', '8080'],
            output='screen',
            name='mesh_server'
        ),

        # 6. React Frontend (Port 5173) - NOW WITH --host FOR MOBILE ACCESS
        ExecuteProcess(
            cmd=['npm', 'run', 'dev', '--prefix', react_app_path, '--', '--host'],
            output='screen',
            name='react_frontend'
        ),
    ])