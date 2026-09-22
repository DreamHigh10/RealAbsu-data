<?php
require_once '../config/database.php';
require_once '../includes/functions.php';
if($_SERVER['REQUEST_METHOD'] == 'POST'){
    verify_csrf();
    $email = sanitize($_POST['email']);
    $pass = $_POST['password'];
    $stmt = $pdo->prepare("SELECT * FROM admin WHERE email = ?");
    $stmt->execute([$email]);
    $admin = $stmt->fetch();
    if($admin && password_verify($pass, $admin['password_hash'])) {
        $_SESSION['admin_id'] = $admin['id'];
        header("Location: dashboard.php"); exit;
    } else {
        $error = "Invalid admin credentials.";
    }
}
include '../includes/header.php';
?>
<div class="row justify-content-center">
    <div class="col-md-5">
        <div class="card shadow-sm mt-5">
            <div class="card-header bg-dark text-white"><h5>Admin Login</h5></div>
            <div class="card-body">
                <?php if(isset($error)) echo "<div class='alert alert-danger'>$error</div>"; ?>
                <form method="post">
                    <?php csrf_field(); ?>
                    <div class="mb-3"><label>Email</label><input type="email" name="email" class="form-control" required></div>
                    <div class="mb-3"><label>Password</label><input type="password" name="password" class="form-control" required></div>
                    <button class="btn btn-dark w-100">Login</button>
                </form>
            </div>
        </div>
    </div>
</div>
<?php include '../includes/footer.php'; ?>