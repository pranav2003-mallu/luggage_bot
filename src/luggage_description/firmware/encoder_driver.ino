/*
 * Developed by Humynex Robotics - We make your ideas into reality
 * Email: humynexrobotics@gmail.com
 * Phone: 8714358646
 */

#ifdef USE_BASE

volatile long l_enc_pos = 0L;
volatile long r_enc_pos = 0L;

// Left Front Encoder ISR
void lfEncoderISR() {
  if (digitalRead(LF_ENC_PIN_A) == digitalRead(LF_ENC_PIN_B)) l_enc_pos++; else l_enc_pos--; 
}

// Left Rear Encoder ISR
void lrEncoderISR() {
  if (digitalRead(LR_ENC_PIN_A) == digitalRead(LR_ENC_PIN_B)) l_enc_pos++; else l_enc_pos--; 
}

// Right Front Encoder ISR
void rfEncoderISR() {
  if (digitalRead(RF_ENC_PIN_A) == digitalRead(RF_ENC_PIN_B)) r_enc_pos--; else r_enc_pos++; 
}

// Right Rear Encoder ISR
void rrEncoderISR() {
  if (digitalRead(RR_ENC_PIN_A) == digitalRead(RR_ENC_PIN_B)) r_enc_pos--; else r_enc_pos++; 
}

void initEncoders() {
  // Configure ALL Encoders
  pinMode(LF_ENC_PIN_A, INPUT_PULLUP);
  pinMode(LF_ENC_PIN_B, INPUT_PULLUP);
  pinMode(LR_ENC_PIN_A, INPUT_PULLUP);
  pinMode(LR_ENC_PIN_B, INPUT_PULLUP);
  pinMode(RF_ENC_PIN_A, INPUT_PULLUP);
  pinMode(RF_ENC_PIN_B, INPUT_PULLUP);
  pinMode(RR_ENC_PIN_A, INPUT_PULLUP);
  pinMode(RR_ENC_PIN_B, INPUT_PULLUP);
  
  attachInterrupt(digitalPinToInterrupt(LF_ENC_PIN_A), lfEncoderISR, CHANGE);
  attachInterrupt(digitalPinToInterrupt(LR_ENC_PIN_A), lrEncoderISR, CHANGE);
  attachInterrupt(digitalPinToInterrupt(RF_ENC_PIN_A), rfEncoderISR, CHANGE);
  attachInterrupt(digitalPinToInterrupt(RR_ENC_PIN_A), rrEncoderISR, CHANGE);
}

long readEncoder(int i) {
  if (i == LEFT) return l_enc_pos;
  else return r_enc_pos;
}

void resetEncoder(int i) {
  if (i == LEFT) l_enc_pos = 0L;
  else r_enc_pos = 0L;
}

void resetEncoders() {
  resetEncoder(LEFT);
  resetEncoder(RIGHT);
}

#endif
