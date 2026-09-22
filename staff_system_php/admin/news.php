<?php
require_once '../config/database.php';
require_once '../includes/functions.php';
require_admin();

if(isset($_GET['delete'])) {
    $pdo->prepare("DELETE FROM news WHERE id=?")->execute([$_GET['delete']]);
    header("Location: news.php"); exit;
}

if($_SERVER['REQUEST_METHOD'] == 'POST') {
    verify_csrf();
    $title = sanitize($_POST['title']);
    $body = sanitize($_POST['body']);
    
    $photo_path = null;
    if(!empty($_FILES['image']['name'])) {
        $photo_path = time().'_'.$_FILES['image']['name'];
        move_uploaded_file($_FILES['image']['tmp_name'], "../uploads/news/".$photo_path);
    }
    
    $pdo->prepare("INSERT INTO news (admin_id, title, body, image_path) VALUES (?,?,?,?)")
        ->execute([$_SESSION['admin_id'], $title, $body, $photo_path]);
    header("Location: news.php"); exit;
}

$news = $pdo->query("SELECT * FROM news ORDER BY posted_at DESC")->fetchAll();
include '../includes/header.php';
?>
<div class="row">
    <div class="col-md-5">
        <div class="card shadow-sm"><div class="card-header bg-warning"><h5>Post Announcement</h5></div>
        <div class="card-body">
            <form method="post" enctype="multipart/form-data">
                <?php csrf_field(); ?>
                <div class="mb-3"><label>Title</label><input type="text" name="title" class="form-control" required></div>
                <div class="mb-3"><label>Body</label><textarea name="body" class="form-control" rows="4" required></textarea></div>
                <div class="mb-3"><label>Optional Image</label><input type="file" name="image" class="form-control" accept="image/*"></div>
                <button class="btn btn-dark w-100">Post News</button>
            </form>
        </div></div>
    </div>
    <div class="col-md-7">
        <h4>Recent News</h4>
        <ul class="list-group shadow-sm">
            <?php foreach($news as $n): ?>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong><?= htmlspecialchars($n['title']) ?></strong><br>
                        <small class="text-muted"><?= $n['posted_at'] ?></small>
                    </div>
                    <a href="?delete=<?= $n['id'] ?>" class="btn btn-sm btn-danger" onclick="return confirm('Delete this post?')">Delete</a>
                </li>
            <?php endforeach; ?>
        </ul>
    </div>
</div>
<?php include '../includes/footer.php'; ?>