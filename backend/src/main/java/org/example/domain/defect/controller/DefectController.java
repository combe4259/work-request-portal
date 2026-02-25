package org.example.domain.defect.controller;

import org.example.domain.defect.dto.DefectCreateRequest;
import org.example.domain.defect.dto.DefectDetailResponse;
import org.example.domain.defect.dto.DefectListResponse;
import org.example.domain.defect.dto.DefectStatusUpdateRequest;
import org.example.domain.defect.dto.DefectUpdateRequest;
import org.example.domain.defect.service.DefectService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/defects")
public class DefectController {

    private final DefectService defectService;

    public DefectController(DefectService defectService) {
        this.defectService = defectService;
    }

    @GetMapping
    public Page<DefectListResponse> getDefects(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return defectService.findPage(page, size);
    }

    @GetMapping("/{id}")
    public DefectDetailResponse getDefect(@PathVariable Long id) {
        return defectService.findById(id);
    }

    @PostMapping
    public ResponseEntity<Map<String, Long>> createDefect(@RequestBody DefectCreateRequest request) {
        Long id = defectService.create(request);
        return ResponseEntity.ok(Map.of("id", id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Void> updateDefect(
            @PathVariable Long id,
            @RequestBody DefectUpdateRequest request
    ) {
        defectService.update(id, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDefect(@PathVariable Long id) {
        defectService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateDefectStatus(
            @PathVariable Long id,
            @RequestBody DefectStatusUpdateRequest request
    ) {
        defectService.updateStatus(id, request);
        return ResponseEntity.noContent().build();
    }
}
