// 网址后加 ?skip 可以跳过开场动画，直接进「我们的家」，方便调试
G.start(/[?&]skip/.test(location.search) ? G.Home() : G.Intro());
