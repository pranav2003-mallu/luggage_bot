/*
 * Developed by Humynex Robotics - We make your ideas into reality
 * Email: humynexrobotics@gmail.com
 * Phone: 8714358646
 */

#ifdef USE_BASE

void initMotorController() {
  pinMode(LF_PWM, OUTPUT); pinMode(LF_IN1, OUTPUT); pinMode(LF_IN2, OUTPUT);
  pinMode(LR_PWM, OUTPUT); pinMode(LR_IN1, OUTPUT); pinMode(LR_IN2, OUTPUT);
  pinMode(RF_PWM, OUTPUT); pinMode(RF_IN1, OUTPUT); pinMode(RF_IN2, OUTPUT);
  pinMode(RR_PWM, OUTPUT); pinMode(RR_IN1, OUTPUT); pinMode(RR_IN2, OUTPUT);
}

void setMotorSpeed(int i, int spd) {
  int pwm = abs(spd);
  // limit max PWM to MAX_PWM for Pico's default 8-bit analogWrite
  if (pwm > MAX_PWM) pwm = MAX_PWM;
  
  if (i == LEFT) {
    if (spd >= 0) {
      digitalWrite(LF_IN1, HIGH); digitalWrite(LF_IN2, LOW);
      digitalWrite(LR_IN1, HIGH); digitalWrite(LR_IN2, LOW);
    } else {
      digitalWrite(LF_IN1, LOW); digitalWrite(LF_IN2, HIGH);
      digitalWrite(LR_IN1, LOW); digitalWrite(LR_IN2, HIGH);
    }
    analogWrite(LF_PWM, pwm);
    analogWrite(LR_PWM, pwm);
  } else {
    // RIGHT
    if (spd >= 0) {
      digitalWrite(RF_IN1, HIGH); digitalWrite(RF_IN2, LOW);
      digitalWrite(RR_IN1, HIGH); digitalWrite(RR_IN2, LOW);
    } else {
      digitalWrite(RF_IN1, LOW); digitalWrite(RF_IN2, HIGH);
      digitalWrite(RR_IN1, LOW); digitalWrite(RR_IN2, HIGH);
    }
    analogWrite(RF_PWM, pwm);
    analogWrite(RR_PWM, pwm);
  }
}

void setMotorSpeeds(int leftSpeed, int rightSpeed) {
  setMotorSpeed(LEFT, leftSpeed);
  setMotorSpeed(RIGHT, rightSpeed);
}

#endif
