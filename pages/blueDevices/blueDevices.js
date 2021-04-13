
//获取应用实例
const app = getApp();
const util = require('../../utils/util.js');
var scanList = [];
Page({
  data: {
    deviceList: [],
    deviceId: "",
  },
  bindViewConnect: function (event) {
    var self = this,
      deviceId = event.currentTarget.dataset.value;
    self.setData({
      deviceId: deviceId
    });
    wx.navigateTo({
      url: '/pages/blueWifi/blueWifi?deviceId=' + deviceId,
    })
    
  },
  getBluDevice: function () {
    var self = this;
    wx.startBluetoothDevicesDiscovery({
      success: function (res) {
        wx.onBluetoothDeviceFound(function (res) {
          var list = util.filterDevice(res.devices, "name");
          console.log(list);
          if (list.length > 0) {
            var deviceList = self.data.deviceList;
            wx.hideLoading();
            list.forEach(function(item) {
              var flag = true;
              for (var i = 0; i < deviceList.length; i++) {
                var itemSub = deviceList[i];
                if (itemSub.deviceId === item.deviceId) {
                  flag = false;
                  break;
                }
              }
              if (flag) {
                deviceList.push(item);
              }
            })
            self.setData({
              deviceList: deviceList
            })
          }
        })
      }
    })
  },
  
  onLoad: function () {
    var self = this;
    wx.setNavigationBarTitle({
      title: 'Blue扫描'
    });
    wx.showLoading({
      title: '设备扫描中...',
    })
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
    var self = this,
      deviceId = self.data.deviceId;
    self.getBluDevice();
    if (!util._isEmpty(deviceId)) {
      wx.closeBLEConnection({
        deviceId: deviceId,
      })
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    wx.stopBluetoothDevicesDiscovery()
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    
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

})
