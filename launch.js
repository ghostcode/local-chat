// launch.js
// 打包后的 exe 入口：设置 OPEN_BROWSER 标志后启动 server.js

process.env.OPEN_BROWSER = '1';
require('./server.js');
