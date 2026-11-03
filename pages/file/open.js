/**
 * 打开远端文件：wx.downloadFile → 文档 openDocument / 图片 saveImageToPhotosAlbum。
 * 供 live-web 小节页在小程序 web-view 内跳转（H5 的 iframe / a[download] 在此环境不可用）。
 *
 * query:
 * - url  编码后的文件地址（CDN 或原生桶均可）
 * - name 文件名（用于推断类型 / 提示）
 * - mode preview | download（文档 download 时 showMenu，便于保存转发）
 */
function guessExt(name, url) {
  const raw = String(name || url || '')
    .split('?')[0]
    .toLowerCase();
  const m = raw.match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function isImageExt(ext) {
  return (
    ext === 'png' ||
    ext === 'jpg' ||
    ext === 'jpeg' ||
    ext === 'gif' ||
    ext === 'webp' ||
    ext === 'bmp'
  );
}

function isDocExt(ext) {
  return (
    ext === 'doc' ||
    ext === 'docx' ||
    ext === 'xls' ||
    ext === 'xlsx' ||
    ext === 'ppt' ||
    ext === 'pptx' ||
    ext === 'pdf'
  );
}

function goBackSoon(ms) {
  setTimeout(() => wx.navigateBack({ fail() {} }), ms || 400);
}

function openAsDocument(filePath, fileType, mode) {
  const openOpts = {
    filePath,
    showMenu: true,
    success() {
      wx.hideLoading();
      if (mode === 'download') {
        wx.showToast({
          title: '可点右上角保存',
          icon: 'none',
          duration: 2000,
        });
      }
      goBackSoon(mode === 'download' ? 600 : 400);
    },
    fail() {
      wx.hideLoading();
      wx.showToast({ title: '无法打开该文件', icon: 'none' });
      goBackSoon(1200);
    },
  };
  if (fileType) {
    openOpts.fileType = fileType;
  }
  wx.openDocument(openOpts);
}

function saveAsImage(filePath) {
  wx.getSetting({
    success(setting) {
      const ok =
        setting.authSetting && setting.authSetting['scope.writePhotosAlbum'];
      const doSave = () => {
        wx.saveImageToPhotosAlbum({
          filePath,
          success() {
            wx.hideLoading();
            wx.showToast({ title: '已保存到相册', icon: 'success' });
            goBackSoon(800);
          },
          fail() {
            wx.hideLoading();
            wx.showToast({ title: '保存失败', icon: 'none' });
            goBackSoon(1200);
          },
        });
      };
      if (ok) {
        doSave();
        return;
      }
      wx.authorize({
        scope: 'scope.writePhotosAlbum',
        success: doSave,
        fail() {
          wx.hideLoading();
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中允许保存到相册',
            confirmText: '去设置',
            success(r) {
              if (r.confirm) {
                wx.openSetting({});
              }
              goBackSoon(400);
            },
          });
        },
      });
    },
    fail() {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
      goBackSoon(1200);
    },
  });
}

Page({
  data: {
    tip: '正在打开…',
  },

  onLoad(query) {
    const url = query && query.url ? decodeURIComponent(String(query.url)) : '';
    const name =
      query && query.name ? decodeURIComponent(String(query.name)) : '文件';
    const mode =
      query && query.mode ? String(query.mode).trim().toLowerCase() : 'preview';
    if (!url) {
      this.setData({ tip: '缺少文件地址' });
      wx.showToast({ title: '缺少文件地址', icon: 'none' });
      goBackSoon(1200);
      return;
    }

    const ext = guessExt(name, url);
    const asImage = isImageExt(ext);
    const loadingTitle = asImage
      ? '保存中'
      : mode === 'download'
        ? '下载中'
        : '打开中';
    this.setData({ tip: loadingTitle + '…' });
    wx.showLoading({ title: loadingTitle, mask: true });

    wx.downloadFile({
      url,
      success: (res) => {
        if (!res || res.statusCode !== 200 || !res.tempFilePath) {
          wx.hideLoading();
          this.setData({ tip: '下载失败' });
          wx.showToast({ title: '下载失败', icon: 'none' });
          goBackSoon(1200);
          return;
        }
        if (asImage) {
          saveAsImage(res.tempFilePath);
          return;
        }
        openAsDocument(
          res.tempFilePath,
          isDocExt(ext) ? ext : '',
          mode,
        );
      },
      fail: () => {
        wx.hideLoading();
        this.setData({ tip: '下载失败，请检查域名配置' });
        wx.showToast({ title: '下载失败', icon: 'none' });
        goBackSoon(1200);
      },
    });
  },
});
