#include <Wire.h>
#include <ESP8266WiFi.h>
#include "HIH91XX.h"

HIH91XX hih(0x27);

const char* ssid     = "Mandana's iPhone";
const char* password = "h3b0ic17va6a6";

const char* host = "172.20.10.5";

void setup()
{
  Serial.begin(9600);
  Wire.begin();
}

void loop()
{
  Serial.println();
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);

  // connect to wifi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");  
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());

  Serial.print("connecting to ");
  Serial.println(host);

  // Use WiFiClient class to create TCP connections
  WiFiClient client;
  const int httpPort = 8080;
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
  Serial.println(humidity);
  Serial.println(humidityStr);

  //Serial.println(100 * hih.humidity());
  //Serial.print(hih.temperature(), 5);
  
  // We now create a URI for the request
  String url = "/test?";
  url += "humidity=" + humidityStr;
  url += "&temperature=" + tempStr;
  
  Serial.print("Requesting URL: ");
  Serial.println(url);
  
  // This will send the request to the server
  client.print(String("GET ") + url + " HTTP/1.1\r\n" +
               "Host: " + host + "\r\n" + 
               "Connection: close\r\n\r\n");
               
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
  delay(1000);
}
