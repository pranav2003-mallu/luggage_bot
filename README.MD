# 🧳 Aeroporter OS - Intelligent Luggage System

**Version:** 2.3.2  
**Environment:** Ubuntu 22.04 | ROS 2 Humble  

> **Developed by Humynex Robotics – We make your ideas into reality**  
> ✉️ **Email:** humynexrobotics@gmail.com | 📞 **Phone:** 8714358646

---

## 🚀 Welcome to the Future of Robotics
Aeroporter OS is a state-of-the-art navigation and management system built for automated luggage transport. Powered by ROS 2 and an intuitive web-based interface, Aeroporter OS bridges the gap between complex robotic infrastructures and seamless user experiences.

---

## 🛠️ Installation & Setup

### 1. Extract and Prepare
1. Extract the downloaded `.zip` file.
2. Rename the extracted folder to exactly `luggage_bot`.
3. Move the `luggage_bot` folder directly into your **Home** directory (`~`).

Verify your directory:
```bash
cd ~/luggage_bot
```

### 2. Install System Dependencies
Install ROS 2 packages and build dependencies:
```bash
sudo apt update
sudo apt install -y ros-humble-rosbridge-server \
                    ros-humble-slam-toolbox \
                    ros-humble-navigation2 \
                    ros-humble-nav2-bringup \
                    ros-humble-xacro \
                    ros-humble-joint-state-publisher-gui \
                    nodejs npm

sudo npm install -g http-server
```

### 3. Setup Permissions
Allow the robot interface to safety power off the system without password prompts:
```bash
echo "$USER ALL=(ALL) NOPASSWD: /usr/sbin/poweroff" | sudo tee /etc/sudoers.d/robot_power
```

### 4. Install Web Interface
Configure the dashboard:
```bash
cd ~/luggage_bot/src/luggage_gui/frontend
npm install
```

### 5. Build Workspace
Compile Aeroporter OS packages:
```bash
cd ~/luggage_bot
colcon build --symlink-install
```

---

## 🎮 Operations

### Launching the System
Initialize the React frontend, ROS backend, and ROS bridge:
```bash
source ~/luggage_bot/install/setup.bash
ros2 launch luggage_gui humynex_os.launch.py
```

### Dashboard Access (PC or Laptop)
Open **Google Chrome** or **Firefox** and navigate to:  
👉 **[http://localhost:5173](http://localhost:5173)**  

Select **Free Drive** > **Simulation** and intuitively control your robot.

### Remote Access (Smartphone/Tablet)
Aeroporter OS features a beautiful responsive UI for 100% screen mirroring and control.
1. Connect mobile device to the same **WiFi network** as the robot.
2. Click the **Control Panel** (Settings icon) on the laptop GUI.
3. Access the **Mobile URL** displayed under *REMOTE ACCESS* (e.g., `http://192.168.x.x:5173`) on your phone.

### System Shutdown
To safely turn off the stack and OS:
1. Tap the **Control Panel** (Settings icon).
2. Press the **SOFTWARE HALT** button.
3. Once the screen reads "System Halted", safely close terminal windows.

---
*© 2026 Humynex Robotics. All rights reserved.*
