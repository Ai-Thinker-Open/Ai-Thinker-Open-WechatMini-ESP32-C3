const app = getApp()
import mqtt from '../../../utils/mqtt.min.js';
//连接的服务器域名，注意格式！！！
const host = 'wxs://aligenie.xuhongv.com/mqtt';
const util = require('../../../utils/color_util.js');
let colorPickerCtx = {};
let sliderCtx = {};
let _this = null;

Page({
  data: {
    pickColor: null,
    raduis: 550, //这里最大为750rpx铺满屏幕
    valueWidthOrHerght: 0,
    inputText: 'Hello World!',
    receiveText: '',
    receiveArry: [],
    name: '',
    connectedDeviceId: '',
    serviceId: 0,
    characteristics: {},
    connected: true,
    recieveDatas: "",
    nums: 0,
    isCheckOutControl: false,
    currentControlWays: '蓝牙',
    client: null,
    //记录重连的次数
    reconnectCounts: 0,
    //MQTT连接的配置
    options: {
      protocolVersion: 4, //MQTT连接协议版本
      clientId: 'miniTest',
      clean: false,
      password: 'xuhong12346',
      username: 'admin',
      reconnectPeriod: 1000, //1000毫秒，两次重新连接之间的间隔
      connectTimeout: 30 * 1000, //1000毫秒，两次重新连接之间的间隔
      resubscribe: true //如果连接断开并重新连接，则会再次自动订阅已订阅的主题（默认true）
    }
  },
  connect_mqtt: function () {
    var that = this;
    //开始连接
    this.data.client = mqtt.connect(host, this.data.options);
    this.data.client.on('connect', function (connack) {
      that.data.client.subscribe('/esp32-c3/7cdfa1322e68/devPub', function (err, granted) { })
      console.log(" 服务器 connect ok")
    })


    //服务器下发消息的回调
    that.data.client.on("message", function (topic, payload) {
      console.log(" 收到 topic:" + topic + " , payload :" + payload)
      wx.showModal({
        content: " 收到topic:[" + topic + "], payload :[" + payload + "]",
        showCancel: false,
      });
    })


    //服务器连接异常的回调
    that.data.client.on("error", function (error) {
      console.log(" 服务器 error 的回调" + error)
      wx.showToast({
        title: 'MQTT服务器连接失败'
      })

    })

    //服务器重连连接异常的回调
    that.data.client.on("reconnect", function () {
      console.log(" 服务器 reconnect的回调")

    })


    //服务器连接异常的回调
    that.data.client.on("offline", function (errr) {
      console.log(" 服务器offline的回调")

    })


  },
  bindInput: function (e) {
    this.setData({
      inputText: e.detail.value
    })
  },
  SendTap: function (red, green, blue) {
    console.log('22', this.data.isCheckOutControl)
    var that = this
    if (!this.data.isCheckOutControl) {
      if (this.data.connected) {
        var buffer = new ArrayBuffer(that.data.inputText.length)
        var dataView = new Uint8Array(buffer)
        dataView[0] = red; dataView[1] = green; dataView[2] = blue;
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
  onLoad: function (options) {
    var that = this
    this.connect_mqtt()
    that.setData({
      name: options.name,
      connectedDeviceId: options.connectedDeviceId
    })
    wx.getBLEDeviceServices({
      deviceId: that.data.connectedDeviceId,
      success: function (res) {
        console.log("res.services:", JSON.stringify(res.services))
        var all_UUID = res.services;
        var index_uuid = -1;
        var UUID_lenght = all_UUID.length;
        /* 遍历服务数组 */
        for (var index = 0; index < UUID_lenght; index++) {
          var ergodic_UUID = all_UUID[index].uuid; //取出服务里面的UUID
          /* 判断是否是我们需要的00010203-0405-0607-0809-0A0B0C0D1910*/
          if (ergodic_UUID == '000000FF-0000-1000-8000-00805F9B34FB') {
            index_uuid = index;
          };
        };
        if (index_uuid == -1) {
          wx.showModal({
            title: '提示',
            content: '非我方出售的设备',
            showCancel: false,
            success: function (res) {
              that.setData({
                searching: false
              })
            }
          })
        }
        that.setData({
          serviceId: res.services[index_uuid].uuid
        })
        wx.getBLEDeviceCharacteristics({
          deviceId: options.connectedDeviceId,
          serviceId: res.services[index_uuid].uuid,
          success: function (res) {
            console.log("characteristics ID:", res.characteristics)
            that.setData({
              characteristics: res.characteristics
            })
            wx.notifyBLECharacteristicValueChange({
              state: true,
              deviceId: options.connectedDeviceId,
              serviceId: that.data.serviceId,
              characteristicId: "0000FF01-0000-1000-8000-00805F9B34FB",
              success: function (res) {
                console.log('启用notify成功')
              },
              fail(res) {
                console.log(res)
              }
            })
          }
        })
      }
    })
    wx.onBLEConnectionStateChange(function (res) {
      console.log(res.connected)
      that.setData({
        connected: res.connected
      })
    })

    wx.onBLECharacteristicValueChange(function (res) {
      var recieveData = app.buf2hex(res.value);
    })

    _this = this
    colorPickerCtx = wx.createCanvasContext('colorPicker');
    colorPickerCtx.fillStyle = 'rgb(255, 255, 255)';
    sliderCtx = wx.createCanvasContext('colorPickerSlider');

    let isInit = true;

    wx.createSelectorQuery().select('#colorPicker').boundingClientRect(function (rect) {
      _this.setData({
        valueWidthOrHerght: rect.width,
      })
      if (isInit) {
        colorPickerCtx.fillRect(0, 0, rect.width, rect.height);
        util.drawRing(colorPickerCtx, rect.width, rect.height);
        // 设置默认位置
        util.drawSlider(sliderCtx, rect.width, rect.height, 1.0);
        isInit = false;
      }

      _this.setData({
        pickColor: JSON.stringify({
          red: 255,
          green: 0,
          blue: 0
        })
      })
    }).exec();

  },
  onUnload: function () {
    wx.closeBLEConnection({
      deviceId: this.data.connectedDeviceId,
      success: function (res) { },
    })
  },
  SendCleanTap: function () {
    this.setData({
      inputText: ''
    })
  },
  RecvCleanTap: function () {
    this.setData({
      receiveText: '',
      nums: 0
    })
  },
  SendValue: function (e) {
    this.setData({
      inputText: e.detail.value
    })
  },
  getNowTime: function () {
    // 加0
    function add_10(num) {
      if (num < 10) {
        num = '0' + num
      }
      return num;
    }
    var myDate = new Date();
    myDate.getYear(); //获取当前年份(2位)
    myDate.getFullYear(); //获取完整的年份(4位,1970-????)
    myDate.getMonth(); //获取当前月份(0-11,0代表1月)
    myDate.getDate(); //获取当前日(1-31)
    myDate.getDay(); //获取当前星期X(0-6,0代表星期天)
    myDate.getTime(); //获取当前时间(从1970.1.1开始的毫秒数)
    myDate.getHours(); //获取当前小时数(0-23)
    myDate.getMinutes(); //获取当前分钟数(0-59)
    myDate.getSeconds(); //获取当前秒数(0-59)
    myDate.getMilliseconds(); //获取当前毫秒数(0-999)
    myDate.toLocaleDateString(); //获取当前日期
    var nowTime = add_10(myDate.getHours()) + '时' + add_10(myDate.getMinutes()) + '分' + add_10(myDate.getSeconds()) + '秒 收到：';
    return nowTime;
  },
  onSlide: function (e) {
    let that = this;
    if (e.touches && (e.type === 'touchend')) {
      console.log("ok");
      let x = e.changedTouches[0].x;
      let y = e.changedTouches[0].y;
      if (e.type !== 'touchend') {
        x = e.touches[0].x;
        y = e.touches[0].y;
      }
      //复制画布上指定矩形的像素数据
      wx.canvasGetImageData({
        canvasId: "colorPicker",
        x: x,
        y: y,
        width: 1,
        height: 1,
        success(res) {
          // 转换成hsl格式，获取旋转角度
          let h = util.rgb2hsl(res.data[0], res.data[1], res.data[2]);
          that.SendTap(res.data[0], res.data[1], res.data[2]);
          that.setData({
            pickColor: JSON.stringify({
              red: res.data[0],
              green: res.data[1],
              blue: res.data[2]
            })
          })
          // 判断是否在圈内
          if (h[1] !== 1.0) {
            return;
          }
          util.drawSlider(sliderCtx, _this.data.valueWidthOrHerght, _this.data.valueWidthOrHerght, h[0]);
          // 设置设备
          if (e.type !== 'touchEnd') {
            // 触摸结束才设置设备属性
            return;
          }
        }
      });
    }
  },
  onChangeCheckOutControl({ detail }) {
    let ways = '蓝牙'
    if (detail) {
      ways = 'WiFi'
    }
    this.setData({ isCheckOutControl: detail, currentControlWays: ways });
  }
})