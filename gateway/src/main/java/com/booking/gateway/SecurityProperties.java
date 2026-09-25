package com.booking.gateway;

import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param jwtSecret   shared HMAC secret (must match the User Service, at least 32 bytes)
 * @param publicPaths paths that skip authentication, optionally prefixed with an HTTP method,
 *                    e.g. {@code GET /api/products/**}
 */
@ConfigurationProperties(prefix = "security")
public record SecurityProperties(String jwtSecret, List<String> publicPaths) {
}
