import os
from glob import glob
from setuptools import find_packages, setup

package_name = 'luggage_gui'

setup(
    name=package_name,
    version='0.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        # THIS IS THE MISSING MAGIC LINE:
        (os.path.join('share', package_name, 'launch'), glob('launch/*.py')),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='Humynex Robotics',
    maintainer_email='humynexrobotics@gmail.com',
    description='Humynex OS React Frontend Interface',
    license='Apache-2.0',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'pose_tracker = luggage_gui.pose_tracker:main',
            'system_manager = luggage_gui.system_manager:main',
            'wifi_manager = luggage_gui.wifi_manager:main',
        ],
    },
)