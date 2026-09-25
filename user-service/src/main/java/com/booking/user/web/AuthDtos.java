package com.booking.user.web;

import java.util.UUID;

import com.booking.user.domain.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8, max = 100) String password,
            @NotBlank @Size(max = 100) String name) {
    }

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {
    }

    public record UserResponse(UUID id, String email, String name, String role) {
        public static UserResponse from(User user) {
            return new UserResponse(user.getId(), user.getEmail(), user.getName(), user.getRole().name());
        }
    }

    public record AuthResponse(String token, long expiresIn, UserResponse user) {
    }
}
