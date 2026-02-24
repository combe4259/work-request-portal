package org.example.domain.meetingNote.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "meeting_action_items")
public class MeetingActionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "meeting_note_id", nullable = false)
    private Long meetingNoteId;

    @Column(nullable = false, length = 500)
    private String content;

    @Column(name = "assignee_id", nullable = false)
    private Long assigneeId;

    @Column(name = "due_date", nullable = false)
    private LocalDate dueDate;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "linked_ref_type", length = 20)
    private String linkedRefType;

    @Column(name = "linked_ref_id")
    private Long linkedRefId;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    public MeetingActionItem() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getMeetingNoteId() {
        return meetingNoteId;
    }

    public void setMeetingNoteId(Long meetingNoteId) {
        this.meetingNoteId = meetingNoteId;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public Long getAssigneeId() {
        return assigneeId;
    }

    public void setAssigneeId(Long assigneeId) {
        this.assigneeId = assigneeId;
    }

    public LocalDate getDueDate() {
        return dueDate;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getLinkedRefType() {
        return linkedRefType;
    }

    public void setLinkedRefType(String linkedRefType) {
        this.linkedRefType = linkedRefType;
    }

    public Long getLinkedRefId() {
        return linkedRefId;
    }

    public void setLinkedRefId(Long linkedRefId) {
        this.linkedRefId = linkedRefId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
