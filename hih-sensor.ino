#include <string.h>
#include <Wire.h>
#include <ESP8266WiFi.h>
#include "HIH91XX.h"

HIH91XX hih(0x27);

const String sensor     = "inlet";
const char* host        = "us-central1-hih-sensor.cloudfunctions.net";
const int loopDelayInMs = 60000;

char ssid[50]     = "SweetHome-2.4";
char password[50] = "bestpersiancucumber1989";

void setup()
{
  Serial.begin(9600);
  Wire.begin();
}

void loop()
{
  if(Serial.available()){
    String command = Serial.readStringUntil(' ');
    String value = Serial.readStringUntil('\n');

    char valueCharArray[50];
    value.toCharArray(valueCharArray, 50);

    if(command.equals("set_ssid")){
        strcpy(ssid, valueCharArray);
    }
    else if(command.equals("set_pass")){
        strcpy(password, valueCharArray);
    }
    else{
        Serial.println("Invalid command");
    }
  }

  Serial.println();
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  // connect to wifi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());

  const int httpPort = 80;
  Serial.print("connecting to ");
  Serial.print(host);
  Serial.print(":" + String(httpPort) + "\n");

  // Use WiFiClient class to create TCP connections
  WiFiClient client;
  if (!client.connect(host, httpPort)) {
    Serial.println("connection failed");
    return;
  }

  // sensor code
  hih.start();
  hih.update();

  float humidity = 100 * hih.humidity();
  float temp = hih.temperature();
  String humidityStr = String(humidity);
  String tempStr = String(temp);

  //Serial.println(100 * hih.humidity());
  //Serial.print(hih.temperature(), 5);

  // We now create a URI for the request
  String url = "/api/sensor?";
  url += "humidity=" + humidityStr;
  url += "&temperature=" + tempStr;
  url += "&sensor=" + sensor;

  Serial.print("Requesting URL: ");
  Serial.println(url);

  // This will send the request to the server
  client.print(String("GET ") + url + " HTTP/1.1\r\n" +
               "Host: " + host + "\r\n" +
               "Connection: keep-alive\r\n\r\n");

  unsigned long timeout = millis();
  while (client.available() == 0) {
    if (millis() - timeout > 5000) {
      Serial.println(">>> Client Timeout !");
      client.stop();
      return;
    }
  }

  // Read all the lines of the reply from server and print them to Serial
  while(client.available()){
    String line = client.readStringUntil('\r');
    Serial.print(line);
  }

  hih.stop();
  delay(loopDelayInMs);
}