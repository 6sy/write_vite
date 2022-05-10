const express = require("express");
const app = express();
const fs = require('fs');
const path = require('path')
const port = 3000;
// 解析sfc
const compilerSFC = require('@vue/compiler-sfc');
// 编译成render函数
const compilerDOM = require('@vue/compiler-dom');
// app.use(express.static("src"));
// 处理路由
app.get("/", (req, res) => {
    // 设置响应类型
    res.setHeader("content-type", "text/html");
    // 返回index.html页面
    res.send(fs.readFileSync('./src/index.html','utf8'));
});
// 正则匹配js后缀的文件
app.get(/(.*)\.js$/, (req, res) => {
    // 拿到js文件绝对路径
    const p = path.join(__dirname, "src\\" + req.url);
    // 设置响应类型为js content-type 和type都要设置
    res.setHeader("content-type", "text/javascript");
    // 返回js文件
    let content = fs.readFileSync(p, "utf8");
    content = rewriteModules(content)
    res.send(content);
});
// 处理裸模块
app.get(/^\/@modules/, (req, res) => {
    // 拿到模块名字
    const moduleName = req.url.slice(10);
    // 去node_modules目录找
    const moduleFolder = path.join(__dirname, "/node_modules", moduleName);
    // 获取package.json中的module字段
    const modulePackageJson = require(moduleFolder + "\\package.json").module;
    // 最终相对地址
    const filePath = path.join(moduleFolder, modulePackageJson);
    const readFile = fs.readFileSync(filePath, "utf8");
    // 设置响应类型为js content-type 和type都要设置
    res.setHeader("content-type", "text/javascript");
    // vue里面也可能有裸模快 需要重写
    res.send(rewriteModules(readFile));
});
// 正则匹配vue后缀的文件
// 读取vue文件，解析为js
app.get(/(.*)\.vue$/, (req, res) => {
    // 拿到vue文件绝对路径
    const p = path.join(__dirname, "src\\" + req.url.split("?")[0]);
    // 获取sfc文件类容
    let content = fs.readFileSync(p, "utf8");
    // 裸模快地址重写
    content = rewriteModules(content);
    // 将sfc解析成AST
    const ast = compilerSFC.parse(content);
    // 解析sfc脚本
    if (!req.query.type) {
        // 获取脚本类容
        const scriptContent = ast.descriptor.script.content;
        // 替换默认导出为常量
        const script = scriptContent.replace("export default", "const _script = ");
        // 设置响应类型为js content-type 和type都要设置
        res.setHeader("content-type", "text/javascript");
        res.send(
            `${rewriteModules(script)}
        // 解析tpl
        import {render as _render} from '${req.url}?type=template';
        // 解析style
        import  '${req.url}?type=style'
        _script.render = _render
        export default _script
        `
        );
    }
    // 解析sfc模板
    else if (req.query.type == "template") {
        // 获取模板类容
        const templateContent = ast.descriptor.template.content;
        // 获取render函数
        const render = compilerDOM.compile(templateContent, { mode: "module" }).code;
        // 设置响应类型为js content-type 和type都要设置
        res.setHeader("content-type", "text/javascript");
        res.send(rewriteModules(render));
    }
    // 解析sfc样式
    else if (req.query.type == "style") {
        // 获取style类容
        let styleContent = ast.descriptor.styles[0].content;
        // 去掉\r \n
        styleContent=styleContent.replace(/\s/g, "");
        res.setHeader("content-type", "text/javascript");
        //返回一个js脚本 写入样式
       res.send(`
       const style  = document.createElement('style');
       style.innerHTML="${styleContent}"
       document.head.appendChild(style)
       `);
    }
});

// 裸模快地址重写 vue=>@modules/vue
function rewriteModules(content){
    let reg = / from ['"](.*)['"]/g
    return content.replace(reg,(s1,s2)=>{
        if (s2.startsWith(".") || s2.startsWith("./") || s2.startsWith("../")){
            return s1
        }else{
            // 裸模块
            return `from '/@modules/${s2}'`
        } 
    })
}

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});
