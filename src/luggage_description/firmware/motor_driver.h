/*
 * Developed by Humynex Robotics - We make your ideas into reality
 * Email: humynexrobotics@gmail.com
 * Phone: 8714358646
 */

#ifndef MOTOR_DRIVER_H
#define MOTOR_DRIVER_H

// Left Front Motor (M1L)
#define LF_PWM 2 // ENA(L)
#define LF_IN1 3 // IN1(L)
#define LF_IN2 4 // IN2(L)

// Left Rear Motor (M2L)
#define LR_PWM 5 // ENB(L)
#define LR_IN1 6 // IN3(L)
#define LR_IN2 7 // IN4(L)

// Right Front Motor (M1R)
#define RF_PWM 8 // ENA(R)
#define RF_IN1 9 // IN1(R)
#define RF_IN2 10 // IN2(R)

// Right Rear Motor (M2R)
#define RR_PWM 11 // ENB(R)
#define RR_IN1 12 // IN3(R)
#define RR_IN2 13 // IN4(R)

void initMotorController();
void setMotorSpeed(int i, int spd);
void setMotorSpeeds(int leftSpeed, int rightSpeed);

#endif
