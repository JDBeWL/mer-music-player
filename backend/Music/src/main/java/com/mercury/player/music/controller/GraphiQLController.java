package com.mercury.player.music.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * 自定义GraphiQL控制器
 * 提供自定义GraphiQL界面访问，解决unpkg CDN访问问题
 */
@Controller
public class GraphiQLController {

    /**
     * 自定义GraphiQL界面访问端点
     * 使用jsDelivr作为CDN替代unpkg
     * @return GraphiQL页面视图名
     */
    @GetMapping("/custom-graphiql")
    public String customGraphiql() {
        return "forward:/static/graphiql_new.html";
    }
}
