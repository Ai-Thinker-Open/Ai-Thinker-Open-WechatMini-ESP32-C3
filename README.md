# Ai-Thinker-BluFi-c3


![在这里插入图片描述](https://img-blog.csdnimg.cn/20210311182721338.png)



# 一、前言


&nbsp;&nbsp;&nbsp;前面已经给大家带来了如何实现小程序WiFi+蓝牙控制ESP32-C3模组的原理，

- [小程序WiFi+蓝牙控制ESP32-C3模组文章](https://xuhong.blog.csdn.net/article/details/114676681)

&nbsp;&nbsp;&nbsp;借助小程序的浪潮，我们再开源一波，这篇给大家再开源一个小程序配网的代码；

--------------------

# 二、 Blufi乐鑫自研的蓝牙配网协议

&nbsp;&nbsp;&nbsp;BluFi 是一款基于蓝牙通道的 Wi-Fi 网络配置功能，适用于 ESP32。它通过安全协议将 Wi-Fi 配置和证书传输到 ESP32，然后 ESP32 可基于这些信息连接到 AP 或建立 SoftAP。

&nbsp;&nbsp;&nbsp;BluFi 流程的关键部分包括数据的分片、加密、校验和验证。

&nbsp;&nbsp;&nbsp;用户可按需自定义用于对称加密、非对称加密和校验的算法。这里我们采用 DH 算法进行密钥协商、128-AES 算法用于数据加密、CRC16 算法用于校验和验证。

## ESP32 配网流程

  1. ESP32 开启 GATT Server 功能，发送带有特定 adv data 的广播。你可以自定义该广播，该广播不属于 BluFi Profile。
  2. 使用手机 APP 搜索到该特定广播，手机作为 GATT Client 连接 ESP32。你可以决定使用哪款手机 APP。
  3. GATT 连接建立成功后，手机向 ESP32 发送“协商过程”数据帧（详情见 BluFi 传输格式 ）。
  4. ESP32 收到“协商过程”数据帧后，会按照使用者自定义的协商过程来解
  5. 析。
  6. 手机与 ESP32 进行密钥协商。协商过程可使用 DH/RSA/ECC 等加密算法进行。
  7. 协商结束后，手机端向 ESP32 发送“设置安全模式”控制帧。
  8. ESP32 收到“设置安全模式”控制帧后，使用经过协商的共享密钥以及配置的安全策略对通信数据进行加密和解密。
  9. 手机向 ESP32 发送“BluFi 传输格式”定义的 SSID、Password 等用于 Wi-Fi 连接的必要信息。
  10. 手机向 ESP32 发送“Wi-Fi 连接请求”控制帧，ESP32 收到之后，识别为手机已将必要的信息传输完毕，准备连接 Wi-Fi。
  11. ESP32 连接到 Wi-Fi 后，发送“Wi-Fi 连接状态报告”控制帧到手机，以报告连接状态。至此配网结束。

##  流程图

![在这里插入图片描述](https://img-blog.csdnimg.cn/20210412111840454.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3hoODcwMTg5MjQ4,size_16,color_FFFFFF,t_70#pic_center)

---------------------

# 三、相关代码

## 3.1 蓝牙快速配网

&nbsp;&nbsp;&nbsp;这里是采用上述的BluFi原理做的一款小程序，效果如下：

![在这里插入图片描述](https://img-blog.csdnimg.cn/20210413105116429.png)
&nbsp;&nbsp;&nbsp;功能特性如下：

  1. 标准的乐鑫BluFi协议，支持ESP32和ESP32-C3模组配网，仅支持2.4G频段AP热点连接，支持双频路由器配网；
  2. 跨平台特性，无关Android和IOS平台，真正实现一套代码多复用；
  3. 过滤搜索蓝牙设备，筛选其他非BluFi协议的蓝牙设备，实现快速选择设备配网；

----------------

## 3.2 蓝牙本地控制

1. 乐鑫物联网操作框架 esp-idf 的 freeRtos 实时操作系统熟悉，包括任务创建/消息队列/进程间通讯；
2. 微信小程序开发基础，包括MQTT库/低功耗蓝牙API接口使用，包括搜索/连接/通讯；
3. 使用乐鑫封装 RMT 驱动层单线驱动WS2812B，实现彩虹等效果；
4. 对ESP32/C3芯片的外设开发熟悉，对BLE API接口使用熟悉，包括自定义广播/名字/自定义UUID；

<font size=4>**蓝牙控制代码**

设置蓝牙广播名字

```c
esp_ble_gap_set_device_name(TEST_DEVICE_NAME);
```

设置服务UUID

```c
 gl_profile_tab[0].service_id.is_primary = true;
 gl_profile_tab[0].service_id.id.inst_id = 0x00;
 gl_profile_tab[0].service_id.id.uuid.len = ESP_UUID_LEN_16;
 gl_profile_tab[0].service_id.id.uuid.uuid.uuid16 = GATTS_SERVICE_UUID_TEST_A;
```

主动通知上位机数据发生改动：

```c
 case ESP_GATTS_READ_EVT:
    {
        esp_gatt_rsp_t rsp;
        memset(&rsp, 0, sizeof(esp_gatt_rsp_t));
        rsp.attr_value.handle = param->read.handle;
        rsp.attr_value.len = 3;
        rsp.attr_value.value[0] = red;
        rsp.attr_value.value[1] = green;
        rsp.attr_value.value[2] = blue;
        esp_ble_gatts_send_response(gatts_if, param->read.conn_id, param->read.trans_id, ESP_GATT_OK, &rsp);
        break;
    }
```

上位机主动发送数据到此并做出对应的处理：

```c
 case ESP_GATTS_WRITE_EVT:
    {
        if (!param->write.is_prep)
        {
            ESP_LOGI(GATTS_TAG, "GATT_WRITE_EVT, value len %d, value :", param->write.len);
            esp_log_buffer_hex(GATTS_TAG, param->write.value, param->write.len);
            //发送数据到队列
            struct __User_data *pTmper;
            sprintf(user_data.allData, "{\"red\":%d,\"green\":%d,\"blue\":%d}", param->write.value[0], param->write.value[1], param->write.value[2]);
            pTmper = &user_data;
            user_data.dataLen = strlen(user_data.allData);
            xQueueSend(ParseJSONQueueHandler, (void *)&pTmper, portMAX_DELAY);

            ESP_LOGI(GATTS_TAG, "%02x %02x %02x ", param->write.value[0], param->write.value[1], param->write.value[2]);
        }
        example_write_event_env(gatts_if, &a_prepare_write_env, param);
        break;
    }
```

<font size=4>**WiFi控制代码**

设置MQTT远程连接的参数

```c
/* 
 * @Description: MQTT参数连接的配置
 * @param: 
 * @return: 
*/
void TaskXMqttRecieve(void *p)
{
    //连接的配置参数
    esp_mqtt_client_config_t mqtt_cfg = {
        .host = "www.xuhong.com",  //连接的域名 ，请务必修改为您的
        .port = 1883,              //端口，请务必修改为您的
        .username = "admin",       //用户名，请务必修改为您的
        .password = "xuhong123456",   //密码，请务必修改为您的
        .client_id = deviceUUID,
        .event_handle = MqttCloudsCallBack, //设置回调函数
        .keepalive = 120,                   //心跳
        .disable_auto_reconnect = false,    //开启自动重连
        .disable_clean_session = false,     //开启 清除会话
    };
    client = esp_mqtt_client_init(&mqtt_cfg);
    esp_mqtt_client_start(client);

    vTaskDelete(NULL);
}
```

服务器下发的处理数据，送往消息队列处理：

```
    //服务器下发消息到本地成功接收回调
    case MQTT_EVENT_DATA:
    {
        printf("TOPIC=%.*s \r\n", event->topic_len, event->topic);
        printf("DATA=%.*s \r\n\r\n", event->data_len, event->data);
        //发送数据到队列
        struct __User_data *pTmper;
        sprintf(user_data.allData, "%s", event->data);
        pTmper = &user_data;
        user_data.dataLen = event->data_len;
        xQueueSend(ParseJSONQueueHandler, (void *)&pTmper, portMAX_DELAY);
        break;
    }
```

## 2.3 外设驱动

七彩灯WS2812B的驱动代码初始化：

```c
/**
 * @description:  封装一层设置RGB灯效果
 * @param {uint16_t} Red 入参 红色
 * @param {uint16_t} Green 入参 绿色
 * @param {uint16_t} Blue 入参 蓝色
 * @return {*}
 */
void set_rgb(uint16_t Red, uint16_t Green, uint16_t Blue)
{
    for (int i = 0; i < 24; i++)
    {
        strip->set_pixel(strip, i, Red, Green, Blue);
    }
    red = Red;
    green = Green;
    blue = Blue;
    strip->refresh(strip, 10);
}

/**
 * @description: 初始化LED 
 * @param {*}
 * @return {*}
 */
void init_led()
{
    rmt_config_t config = RMT_DEFAULT_CONFIG_TX(4, RMT_TX_CHANNEL);
    // set counter clock to 40MHz
    config.clk_div = 2;

    ESP_ERROR_CHECK(rmt_config(&config));
    ESP_ERROR_CHECK(rmt_driver_install(config.channel, 0, 0));

    // install ws2812 driver
    led_strip_config_t strip_config = LED_STRIP_DEFAULT_CONFIG(24, (led_strip_dev_t)config.channel);
    strip = led_strip_new_rmt_ws2812(&strip_config);
    if (!strip)
    {
        ESP_LOGE(TAG, "install WS2812 driver failed");
    }
    // Clear LED strip (turn off all LEDs)
    ESP_ERROR_CHECK(strip->clear(strip, 100));
    set_rgb(0, 254, 0);
}
```

消息队列处理逻辑：

```c
/*
 * @Description: 解析下发数据的队列逻辑处理
 * @param: null
 * @return: 
*/
void Task_ParseJSON(void *pvParameters)
{
    printf("[SY] Task_ParseJSON_Message creat ... \n");

    while (1)
    {
        struct __User_data *pMqttMsg;

        printf("Task_ParseJSON_Message xQueueReceive wait [%d] ... \n", esp_get_free_heap_size());
        xQueueReceive(ParseJSONQueueHandler, &pMqttMsg, portMAX_DELAY);

        printf("Task_ParseJSON_Message xQueueReceive get [%s] ... \n", pMqttMsg->allData);

        ////首先整体判断是否为一个json格式的数据
        cJSON *pJsonRoot = cJSON_Parse(pMqttMsg->allData);
        //如果是否json格式数据
        if (pJsonRoot == NULL)
        {
            printf("[SY] Task_ParseJSON_Message xQueueReceive not json ... \n");
            goto __cJSON_Delete;
        }

        cJSON *pJSON_Item_Red = cJSON_GetObjectItem(pJsonRoot, "red");
        cJSON *pJSON_Item_Green = cJSON_GetObjectItem(pJsonRoot, "green");
        cJSON *pJSON_Item_Blue = cJSON_GetObjectItem(pJsonRoot, "blue");

        set_rgb(pJSON_Item_Red->valueint, pJSON_Item_Green->valueint, pJSON_Item_Blue->valueint);

    __cJSON_Delete:
        cJSON_Delete(pJsonRoot);
    }
}

```

<font size=4>**微信小程序核心代码**

代码架构，UI主要采用第三方库：有 WeUI、Vant-UI库，其中的MQTT库采用开源的MQTT.JS库。

![](https://img-blog.csdnimg.cn/2021041314261625.png)



## 3.1 蓝牙搜索

```
 wx.onBluetoothDeviceFound(function (devices) {
      var isnotexist = true
      if (devices.deviceId) {
        if (devices.advertisData) {
          devices.advertisData = app.buf2hex(devices.advertisData)
        } else {
          devices.advertisData = ''
        }
        for (var i = 0; i < that.data.devicesList.length; i++) {
          if (devices.deviceId == that.data.devicesList[i].deviceId) {
            isnotexist = false
          }
        }
        if (isnotexist && devices[0].name === that.data.filterName ) {
          that.data.devicesList.push(devices[0])
        }
      }
      that.setData({
        devicesList: that.data.devicesList
      })
    })
  }
```

## 3.2 蓝牙服务发现

发现服务列表：```wx.getBLEDeviceServices()```

发现特征值列表：```wx.getBLEDeviceCharacteristics()```

发送设备，判断是否为蓝牙控制或wifi控制：

```javascript
 SendTap: function (red, green, blue) {
    var that = this
    if (!this.data.isCheckOutControl) {
      if (this.data.connected) {
        var buffer = new ArrayBuffer(that.data.inputText.length)
        var dataView = new Uint8Array(buffer)
        dataView[0] = red; 
        dataView[1] = green; 
        dataView[2] = blue;
        wx.writeBLECharacteristicValue({
          deviceId: that.data.connectedDeviceId,
          serviceId: that.data.serviceId,
          characteristicId: "0000FF01-0000-1000-8000-00805F9B34FB",
          value: buffer,
          success: function (res) {
            console.log('发送成功')
          }, fail() {
            wx.showModal({
              title: '提示',
              content: '蓝牙已断开',
              showCancel: false,
              success: function (res) {
              }
            })
          }
        })
      } else {
        wx.showModal({
          title: '提示',
          content: '蓝牙已断开',
          showCancel: false,
          success: function (res) {
            that.setData({
              searching: false
            })
          }
        })
      }
    } else {
      //MQTT通讯发送
      if (this.data.client && this.data.client.connected) {
        this.data.client.publish('/esp32-c3/7cdfa1322e68/devSub', JSON.stringify({red,green,blue}));
      } else {
        wx.showToast({
          title: '请先连接服务器',
          icon: 'none',
          duration: 2000
        })
      }
    }
  },
```

# 四、感谢

为此，还开源了以下的代码仓库，共勉！！

| 开源项目                                                  | 地址                                                        | 开源时间 |
| --------------------------------------------------------- | ----------------------------------------------------------- | -------- |
| 微信小程序连接mqtt服务器，控制esp8266智能硬件             | https://github.com/xuhongv/WeChatMiniEsp8266                | 2018.11  |
| 微信公众号airkiss配网以及近场发现在esp8266 rtos3.1 的实现 | https://github.com/xuhongv/xLibEsp8266Rtos3.1AirKiss        | 2019.3   |
| 微信公众号airkiss配网以及近场发现在esp32 esp-idf 的实现   | https://github.com/xuhongv/xLibEsp32IdfAirKiss              | 2019.9   |
| 微信小程序控制esp8266实现七彩效果项目源码                 | https://github.com/xuhongv/WCMiniColorSetForEsp8266         | 2019.9   |
| 微信小程序蓝牙配网blufi实现在esp32源码                    | https://github.com/xuhongv/BlufiEsp32WeChat                 | 2019.11  |
| 微信小程序蓝牙ble控制esp32七彩灯效果                      | https://blog.csdn.net/xh870189248/article/details/101849759 | 2019.10  |
| 可商用的事件分发的微信小程序mqtt断线重连框架              | https://blog.csdn.net/xh870189248/article/details/88718302  | 2019.2   |
| 微信小程序以 websocket 连接阿里云IOT物联网平台mqtt服务器  | https://blog.csdn.net/xh870189248/article/details/91490697  | 2019.6   |
| 微信公众号网页实现连接mqtt服务器                          | https://blog.csdn.net/xh870189248/article/details/100738444 | 2019.9   |
| 自主开发微信小程序接入腾讯物联开发平台，实现一键配网+控制 | https://github.com/xuhongv/AiThinkerIoTMini                 | 2020.9   |
| 云云对接方案天猫精灵小爱同学服务器+嵌入式Code开源         | https://github.com/xuhongv/xClouds-php                      | 2020.7   |

另外，感谢：

- 乐鑫物联网操作系统：https://github.com/espressif/esp-idf
- 腾讯WeUI框架：https://github.com/Tencent/weui-wxss
- 有赞Vant框架：https://vant-contrib.gitee.io/vant-weapp


