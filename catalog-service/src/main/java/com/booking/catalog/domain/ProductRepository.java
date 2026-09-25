package com.booking.catalog.domain;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    @Query("""
            SELECT p FROM Product p
            WHERE (:q IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))
                              OR LOWER(p.description) LIKE LOWER(CONCAT('%', :q, '%')))
              AND (:category IS NULL OR p.category = :category)
            ORDER BY p.name""")
    List<Product> search(@Param("q") String q, @Param("category") String category);

    /**
     * Atomically takes stock only if enough is left, so two concurrent orders can't oversell.
     *
     * @return 1 when reserved, 0 when there wasn't enough stock (or no such product)
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Product p SET p.stock = p.stock - :qty WHERE p.id = :id AND p.stock >= :qty")
    int reserve(@Param("id") UUID id, @Param("qty") int qty);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Product p SET p.stock = p.stock + :qty WHERE p.id = :id")
    int release(@Param("id") UUID id, @Param("qty") int qty);
}
