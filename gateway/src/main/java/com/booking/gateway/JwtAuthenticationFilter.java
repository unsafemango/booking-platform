package com.booking.gateway;

import java.nio.charset.StandardCharsets;
import java.util.List;

import javax.crypto.SecretKey;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Validates the bearer token on every non-public request and forwards the caller's identity
 * to downstream services as trusted headers. Any identity headers sent by the client are
 * stripped first so they can't be spoofed.
 */
@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    public static final String USER_ID = "X-User-Id";
    public static final String USER_EMAIL = "X-User-Email";
    public static final String USER_ROLE = "X-User-Role";

    private final SecretKey key;
    private final List<PublicPath> publicPaths;
    private final AntPathMatcher matcher = new AntPathMatcher();

    public JwtAuthenticationFilter(SecurityProperties properties) {
        this.key = Keys.hmacShaKeyFor(properties.jwtSecret().getBytes(StandardCharsets.UTF_8));
        this.publicPaths = properties.publicPaths().stream().map(PublicPath::parse).toList();
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest().mutate()
                .headers(h -> {
                    h.remove(USER_ID);
                    h.remove(USER_EMAIL);
                    h.remove(USER_ROLE);
                })
                .build();

        if (request.getMethod() == HttpMethod.OPTIONS || isPublic(request)) {
            return chain.filter(exchange.mutate().request(request).build());
        }

        String header = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith("Bearer ")) {
            return reject(exchange.getResponse(), "Missing bearer token");
        }

        Claims claims;
        try {
            claims = Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(header.substring(7))
                    .getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            return reject(exchange.getResponse(), "Invalid or expired token");
        }

        ServerHttpRequest authenticated = request.mutate()
                .header(USER_ID, claims.getSubject())
                .header(USER_EMAIL, claims.get("email", String.class))
                .header(USER_ROLE, claims.get("role", String.class))
                .build();
        return chain.filter(exchange.mutate().request(authenticated).build());
    }

    private boolean isPublic(ServerHttpRequest request) {
        String path = request.getPath().value();
        return publicPaths.stream().anyMatch(p ->
                (p.method() == null || p.method().equals(request.getMethod()))
                        && matcher.match(p.pattern(), path));
    }

    private Mono<Void> reject(ServerHttpResponse response, String message) {
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        byte[] body = ("{\"error\":\"" + message + "\"}").getBytes(StandardCharsets.UTF_8);
        return response.writeWith(Mono.just(response.bufferFactory().wrap(body)));
    }

    @Override
    public int getOrder() {
        return -100;
    }

    private record PublicPath(HttpMethod method, String pattern) {
        static PublicPath parse(String spec) {
            String[] parts = spec.trim().split("\\s+", 2);
            return parts.length == 2
                    ? new PublicPath(HttpMethod.valueOf(parts[0].toUpperCase()), parts[1])
                    : new PublicPath(null, parts[0]);
        }
    }
}
