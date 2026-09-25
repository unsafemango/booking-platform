package com.booking.gateway;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import reactor.core.publisher.Mono;

class JwtAuthenticationFilterTest {

    static final String SECRET = "test-secret-that-is-at-least-32-bytes-long";

    final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(new SecurityProperties(SECRET,
            List.of("/api/auth/**", "GET /api/products/**", "/socket.io/**")));

    final AtomicReference<ServerHttpRequest> forwarded = new AtomicReference<>();
    final GatewayFilterChain chain = exchange -> {
        forwarded.set(exchange.getRequest());
        return Mono.empty();
    };

    @Test
    void publicPathsPassWithoutToken() {
        run(MockServerHttpRequest.post("/api/auth/login"));
        assertThat(forwarded.get()).isNotNull();

        forwarded.set(null);
        run(MockServerHttpRequest.get("/api/products/123"));
        assertThat(forwarded.get()).isNotNull();
    }

    @Test
    void publicMatchIsMethodSpecific() {
        MockServerWebExchange exchange = run(MockServerHttpRequest.post("/api/products"));
        assertThat(forwarded.get()).isNull();
        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void rejectsMissingAndBadTokens() {
        assertThat(run(MockServerHttpRequest.get("/api/orders")).getResponse().getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);

        String forged = token("other-secret-that-is-also-32-bytes-long!!", new Date(System.currentTimeMillis() + 60_000));
        assertThat(run(MockServerHttpRequest.get("/api/orders").header(HttpHeaders.AUTHORIZATION, "Bearer " + forged))
                .getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        String expired = token(SECRET, new Date(System.currentTimeMillis() - 60_000));
        assertThat(run(MockServerHttpRequest.get("/api/orders").header(HttpHeaders.AUTHORIZATION, "Bearer " + expired))
                .getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(forwarded.get()).isNull();
    }

    @Test
    void forwardsIdentityAndStripsSpoofedHeaders() {
        String valid = token(SECRET, new Date(System.currentTimeMillis() + 60_000));
        run(MockServerHttpRequest.get("/api/orders")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + valid)
                .header("X-User-Role", "ADMIN"));

        HttpHeaders headers = forwarded.get().getHeaders();
        assertThat(headers.get("X-User-Id")).containsExactly("user-1");
        assertThat(headers.get("X-User-Email")).containsExactly("ada@example.com");
        assertThat(headers.get("X-User-Role")).containsExactly("CUSTOMER");
    }

    @Test
    void stripsSpoofedHeadersOnPublicPathsToo() {
        run(MockServerHttpRequest.get("/api/products").header("X-User-Role", "ADMIN"));
        assertThat(forwarded.get().getHeaders().containsKey("X-User-Role")).isFalse();
    }

    private MockServerWebExchange run(MockServerHttpRequest.BaseBuilder<?> request) {
        MockServerWebExchange exchange = MockServerWebExchange.from(request);
        filter.filter(exchange, chain).block();
        return exchange;
    }

    private static String token(String secret, Date expiry) {
        return Jwts.builder()
                .subject("user-1")
                .claim("email", "ada@example.com")
                .claim("role", "CUSTOMER")
                .expiration(expiry)
                .signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)))
                .compact();
    }
}
