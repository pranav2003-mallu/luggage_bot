/*
 * Developed by Humynex Robotics - We make your ideas into reality
 * Email: humynexrobotics@gmail.com
 * Phone: 8714358646
 */

#ifdef USE_BASE

void initMotorController() {
  pinMode(RIGHT_MOTOR_DIR, OUTPUT);
  pinMode(RIGHT_MOTOR_PWM, OUTPUT);
  pinMode(LEFT_MOTOR_DIR, OUTPUT);
  pinMode(LEFT_MOTOR_PWM, OUTPUT);
}

void setMotorSpeed(int i, int spd) {
  unsigned char reverse = 0;

  if (spd < 0) {
    spd = -spd;
    reverse = 1;
  }
  if (spd > 255) {
    spd = 255;
  }
  
  if (i == LEFT) { 
    digitalWrite(LEFT_MOTOR_DIR, reverse);
    analogWrite(LEFT_MOTOR_PWM, spd);
  } else {
    digitalWrite(RIGHT_MOTOR_DIR, reverse);
    analogWrite(RIGHT_MOTOR_PWM, spd);
  }
}

void setMotorSpeeds(int leftSpeed, int rightSpeed) {
  setMotorSpeed(LEFT, leftSpeed);
  setMotorSpeed(RIGHT, rightSpeed);
}

#endif
