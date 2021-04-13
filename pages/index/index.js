//index.js
//获取应用实例
const app = getApp();
const util = require('../../utils/util.js');
Page({
  //事件处理函数
  bindViewBlue: function () {
    wx.closeBluetoothAdapter()
    wx.openBluetoothAdapter({
      success(res) {
        console.log(res)
        wx.startBluetoothDevicesDiscovery({
          success: function (res) {
            wx.navigateTo({
              url: '/pages/blueDevices/blueDevices',
            })
          }
        })
      },
      fail(res) {
        util.showToast("Please turn on the system Bluetooth");
      }
    })
  },
  bindViewWifi: function () {
    wx.navigateTo({
      url: '/pages/operate/search/search',
    })
  },
  onLoad: function (option) {
    wx.getSystemInfo({
      success(res) {
        app.data.system = res.platform
      }
    })
  }
})
