<?php
require_once 'config/database.php';
require_once 'includes/functions.php';
include 'includes/header.php';
$stmt = $pdo->query("SELECT news.*, admin.username FROM news JOIN admin ON news.admin_id = admin.id ORDER BY posted_at DESC");
$news = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<div class="p-5 mb-4 bg-white rounded-3 shadow-sm border">
    <div class="container-fluid py-5 text-center">
        <h1 class="display-5 fw-bold">Welcome to the Staff Portal</h1>
        <p class="col-md-8 mx-auto fs-4 text-muted">View latest announcements and manage your records.</p>
    </div>
</div>
<h3 class="mb-4">Latest News & Announcements</h3>
<div class="row">
    <?php if(empty($news)): ?>
        <div class="col-12"><p class="text-muted">No announcements posted yet.</p></div>
    <?php else: ?>
        <?php foreach($news as $n): ?>
            <div class="col-md-6 mb-4">
                <div class="card h-100 shadow-sm">
                    <?php if($n['image_path']): ?>
                        <img src="/staff_system_php/uploads/news/<?= htmlspecialchars($n['image_path']) ?>" class="card-img-top" alt="News Image" style="height:200px; object-fit:cover;">
                    <?php endif; ?>
                    <div class="card-body">
                        <h5 class="card-title"><?= htmlspecialchars($n['title']) ?></h5>
                        <p class="card-text text-muted small">Posted by <?= htmlspecialchars($n['username']) ?> on <?= date('F j, Y', strtotime($n['posted_at'])) ?></p>
                        <p class="card-text"><?= nl2br(htmlspecialchars($n['body'])) ?></p>
                    </div>
                </div>
            </div>
        <?php endforeach; ?>
    <?php endif; ?>
</div>
<?php include 'includes/footer.php'; ?>