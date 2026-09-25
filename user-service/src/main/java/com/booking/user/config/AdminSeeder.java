package com.booking.user.config;

import com.booking.user.domain.Role;
import com.booking.user.domain.User;
import com.booking.user.domain.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** Creates an admin account on startup when ADMIN_EMAIL and ADMIN_PASSWORD are set. */
@Component
public class AdminSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final String email;
    private final String password;

    public AdminSeeder(UserRepository users, PasswordEncoder encoder,
                       @Value("${admin.email:}") String email,
                       @Value("${admin.password:}") String password) {
        this.users = users;
        this.encoder = encoder;
        this.email = email;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!StringUtils.hasText(email) || !StringUtils.hasText(password) || users.existsByEmailIgnoreCase(email)) {
            return;
        }
        users.save(new User(email.toLowerCase(), encoder.encode(password), "Admin", Role.ADMIN));
        log.info("Seeded admin account {}", email);
    }
}
