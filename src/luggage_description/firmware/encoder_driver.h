#ifndef ENCODER_DRIVER_H
#define ENCODER_DRIVER_H

#define LF_ENC_PIN_A 14
#define LF_ENC_PIN_B 15

#define LR_ENC_PIN_A 16
#define LR_ENC_PIN_B 17

#define RF_ENC_PIN_A 18
#define RF_ENC_PIN_B 19

#define RR_ENC_PIN_A 20
#define RR_ENC_PIN_B 21

long readEncoder(int i);
void resetEncoder(int i);
void resetEncoders();
void initEncoders();

#endif
