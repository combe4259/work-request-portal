package org.example.domain.resource.controller;

import org.example.domain.resource.dto.SharedResourceCreateRequest;
import org.example.domain.resource.dto.SharedResourceDetailResponse;
import org.example.domain.resource.dto.SharedResourceListResponse;
import org.example.domain.resource.dto.SharedResourceUpdateRequest;
import org.example.domain.resource.service.SharedResourceService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/resources")
public class SharedResourceController {

    private final SharedResourceService sharedResourceService;

    public SharedResourceController(SharedResourceService sharedResourceService) {
        this.sharedResourceService = sharedResourceService;
    }

    @GetMapping
    public Page<SharedResourceListResponse> getResources(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return sharedResourceService.findPage(page, size);
    }

    @GetMapping("/{id}")
    public SharedResourceDetailResponse getResource(@PathVariable Long id) {
        return sharedResourceService.findById(id);
    }

    @PostMapping
    public ResponseEntity<Map<String, Long>> createResource(@RequestBody SharedResourceCreateRequest request) {
        Long id = sharedResourceService.create(request);
        return ResponseEntity.ok(Map.of("id", id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Void> updateResource(
            @PathVariable Long id,
            @RequestBody SharedResourceUpdateRequest request
    ) {
        sharedResourceService.update(id, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteResource(@PathVariable Long id) {
        sharedResourceService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
