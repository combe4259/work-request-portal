package org.example.domain.attachment.repository;

import org.example.domain.attachment.entity.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttachmentRepository extends JpaRepository<Attachment, Long> {

    List<Attachment> findByRefTypeAndRefIdOrderByIdDesc(String refType, Long refId);
}
