package org.example.domain.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_preferences")
public class UserPreference {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "notify_assign", nullable = false)
    private Boolean notifyAssign = true;

    @Column(name = "notify_comment", nullable = false)
    private Boolean notifyComment = true;

    @Column(name = "notify_deadline", nullable = false)
    private Boolean notifyDeadline = true;

    @Column(name = "notify_status", nullable = false)
    private Boolean notifyStatus = false;

    @Column(name = "notify_deploy", nullable = false)
    private Boolean notifyDeploy = true;

    @Column(name = "notify_mention", nullable = false)
    private Boolean notifyMention = false;

    @Column(name = "landing_page", nullable = false, length = 50)
    private String landingPage = "/dashboard";

    @Column(name = "row_count", nullable = false)
    private Integer rowCount = 20;

    @Column(name = "avatar_color", nullable = false, length = 20)
    private String avatarColor = "brand";

    @Column(name = "photo_url", columnDefinition = "LONGTEXT")
    private String photoUrl;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    public UserPreference() {
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Boolean getNotifyAssign() {
        return notifyAssign;
    }

    public void setNotifyAssign(Boolean notifyAssign) {
        this.notifyAssign = notifyAssign;
    }

    public Boolean getNotifyComment() {
        return notifyComment;
    }

    public void setNotifyComment(Boolean notifyComment) {
        this.notifyComment = notifyComment;
    }

    public Boolean getNotifyDeadline() {
        return notifyDeadline;
    }

    public void setNotifyDeadline(Boolean notifyDeadline) {
        this.notifyDeadline = notifyDeadline;
    }

    public Boolean getNotifyStatus() {
        return notifyStatus;
    }

    public void setNotifyStatus(Boolean notifyStatus) {
        this.notifyStatus = notifyStatus;
    }

    public Boolean getNotifyDeploy() {
        return notifyDeploy;
    }

    public void setNotifyDeploy(Boolean notifyDeploy) {
        this.notifyDeploy = notifyDeploy;
    }

    public Boolean getNotifyMention() {
        return notifyMention;
    }

    public void setNotifyMention(Boolean notifyMention) {
        this.notifyMention = notifyMention;
    }

    public String getLandingPage() {
        return landingPage;
    }

    public void setLandingPage(String landingPage) {
        this.landingPage = landingPage;
    }

    public Integer getRowCount() {
        return rowCount;
    }

    public void setRowCount(Integer rowCount) {
        this.rowCount = rowCount;
    }

    public String getAvatarColor() {
        return avatarColor;
    }

    public void setAvatarColor(String avatarColor) {
        this.avatarColor = avatarColor;
    }

    public String getPhotoUrl() {
        return photoUrl;
    }

    public void setPhotoUrl(String photoUrl) {
        this.photoUrl = photoUrl;
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
