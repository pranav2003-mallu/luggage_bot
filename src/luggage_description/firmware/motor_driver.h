/*
 * Developed by Humynex Robotics - We make your ideas into reality
 * Email: humynexrobotics@gmail.com
 * Phone: 8714358646
 */

#ifndef MOTOR_DRIVER_H
#define MOTOR_DRIVER_H

// ==========================================
// 🚗 MDD20A MOTOR DRIVER PINS (Cytron)
// ==========================================

// Right Motor
#define RIGHT_MOTOR_PWM 6   // Connect to MDD20A PWM 1
#define RIGHT_MOTOR_DIR 7   // Connect to MDD20A DIR 1

// Left Motor
#define LEFT_MOTOR_PWM 8    // Connect to MDD20A PWM 2
#define LEFT_MOTOR_DIR 9    // Connect to MDD20A DIR 2

void initMotorController();
void setMotorSpeed(int i, int spd);
void setMotorSpeeds(int leftSpeed, int rightSpeed);

#endif
