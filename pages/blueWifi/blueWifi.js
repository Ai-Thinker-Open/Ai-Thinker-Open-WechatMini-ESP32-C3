const app = getApp();
const util = require('../../utils/util.js');
Page({

  /**
   * 页面的初始数据
   */
  data: {
    wifiInfo: null,
    deviceId: "",
    password: "",
  },
  bindPasswordInput: function (e) {
    this.setData({
      password: e.detail.value
    });
  },
  getWifiInfo: function () {
    const self = this;
    wx.startWifi({
      success(res) {
        console.log(res)
        // 先取一次，防止IOS获取不到
        wx.getConnectedWifi({
          success(res) {
            self.setData({
              wifiInfo: res.wifi
            })
          }
        })
        wx.onWifiConnected(function (res) {
          self.setData({
            wifiInfo: res.wifi
          })
        })
      },
      fail(res) {
        console.log(res)
      }
    })
  },
  gotoProvision: function () {
    const wifiInfo = this.data.wifiInfo;
    const ssid = wifiInfo != null ? wifiInfo.SSID : null;
    const bssid = wifiInfo != null ? wifiInfo.BSSID : null;
    const password = this.data.password;
    if (wifiInfo == null) {
      util.showToast("No Wi-Fi connection");
      return;
    }
    const info = {
      ssid: ssid,
      bssid: bssid,
      password: password,
      deviceId: this.data.deviceId
    }
    wx.navigateTo({
      url: '/pages/blueConnect/blueConnect',
      success: function (res) {
        res.eventChannel.emit('dataFromPrepare', info);
      }
    })
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.log(options)
    this.setData({
      deviceId: options.deviceId
    })
    this.getWifiInfo();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    wx.offWifiConnected({});
    wx.stopWifi({})
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})