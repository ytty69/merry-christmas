// 网址后加 ?skip 可以跳过开场动画，方便调试
G.start(/[?&]skip/.test(location.search) ? G.Stage() : G.Intro());
