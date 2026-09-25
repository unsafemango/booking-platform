package com.booking.catalog;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CatalogTest {

    // Seeded by V2__seed_products.sql with stock 8
    static final String CHEFS_TABLE = "3f1c7a0e-0b1a-4c55-9d1e-000000000006";

    @Autowired
    MockMvc mvc;

    @Test
    void listsAndSearchesSeededProducts() throws Exception {
        mvc.perform(get("/api/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", greaterThanOrEqualTo(6)));

        mvc.perform(get("/api/products").param("q", "kayak"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Sunset Kayak Paddle"));

        mvc.perform(get("/api/products").param("category", "Stays"))
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void onlyAdminsCanCreateProducts() throws Exception {
        String body = """
                {"name":"Wine Tasting","category":"Experiences","price":45.00,"stock":10}""";

        mvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON).content(body)
                        .header("X-User-Role", "CUSTOMER"))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/products").contentType(MediaType.APPLICATION_JSON).content(body)
                        .header("X-User-Role", "ADMIN"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty());
    }

    @Test
    void reservesAndReleasesStockWithoutOverselling() throws Exception {
        mvc.perform(post("/internal/products/{id}/reserve", CHEFS_TABLE)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"quantity\":5}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unitPrice").value(150.00))
                .andExpect(jsonPath("$.remainingStock").value(3));

        mvc.perform(post("/internal/products/{id}/reserve", CHEFS_TABLE)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"quantity\":4}"))
                .andExpect(status().isConflict());

        mvc.perform(post("/internal/products/{id}/release", CHEFS_TABLE)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"quantity\":5}"))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/products/{id}", CHEFS_TABLE))
                .andExpect(jsonPath("$.stock").value(8));
    }
}
