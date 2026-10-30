# PIXEL PARTY — 像素风手机 H5

纯原生 HTML/CSS/JS，无依赖、无需构建。

## 运行

- 电脑上直接双击 `index.html` 即可预览（内置合成音效可用）。
- **用手机测试**：在本目录开一个静态服务器，手机连同一个 Wi-Fi 访问电脑 IP：
  ```
  python -m http.server 8000
  # 手机打开 http://<电脑IP>:8000
  ```
- 网址加 `?skip` 跳过开场动画，方便调试。

## 结构

| 文件 | 作用 |
| --- | --- |
| `js/engine.js` | 180px 宽的低分辨率画布放大显示、场景切换、像素圆形转场、触摸输入、震屏/白闪/扫描线 |
| `js/font.js` | 5x7 点阵英文字体；中文用系统字体渲染后二值化成像素字 |
| `js/sprites.js` | 用字符画定义的角色和图标，改字符即可改造型 |
| `js/audio.js` | WebAudio 合成 8bit 音效 + 背景乐，也支持播放 mp3 等文件 |
| `js/intro.js` | 开场动画：开机自检 → 标题落下 → 角色入场 → 点击开始 |
| `js/stage.js` | 互动页：6 个音效按钮、可点的角色、点天空弹音符 |

## 换成自己的音频

把文件放进 `assets/audio/`，在 `js/stage.js` 顶部的 `PADS` 里给按钮加 `src`：

```js
{ id: 'coin', label: '金币', icon: 'coin', color: '#ffd23f', src: 'assets/audio/coin.mp3' },
```

音频文件要通过 http 服务器访问（双击打开的 `file://` 下浏览器会拦截加载）。

## 移动端注意

- 手机浏览器禁止页面自动播放声音，所以开场动画是静音的，「点击开始」那一下用来解锁音频。
- iOS 16.4+ 已设置 `audioSession = 'playback'`，静音键开着也能出声；更老的 iOS 需关闭静音键。
- 震动反馈只在安卓生效（iOS Safari 不支持 `navigator.vibrate`）。
