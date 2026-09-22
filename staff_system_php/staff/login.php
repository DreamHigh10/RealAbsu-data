<?php
require_once '../config/database.php';
require_once '../includes/functions.php';
if($_SERVER['REQUEST_METHOD'] == 'POST'){
    verify_csrf();
    $email = sanitize($_POST['email']);
    $pass = $_POST['password'];
    
    $stmt = $pdo->prepare("SELECT * FROM staff WHERE email = ?");
    $stmt->execute([$email]);
    $staff = $stmt->fetch();
    
    if($staff) {
        if($staff['login_attempts'] >= 5) {
            $error = "Account locked due to multiple failed attempts. Contact Admin.";
        } elseif(password_verify($pass, $staff['password_hash'])) {
            if($staff['status'] == 'pending') {
                $error = "Your account is awaiting Admin approval.";
            } elseif($staff['status'] == 'suspended') {
                $error = "Your account is suspended. Contact Admin.";
            } else {
                $pdo->prepare("UPDATE staff SET login_attempts = 0 WHERE id=?")->execute([$staff['id']]);
                $_SESSION['staff_id'] = $staff['id'];
                header("Location: dashboard.php"); exit;
            }
        } else {
            $pdo->prepare("UPDATE staff SET login_attempts = login_attempts + 1 WHERE id=?")->execute([$staff['id']]);
            $error = "Invalid credentials.";
        }
    } else {
        $error = "Invalid credentials.";
    }
}
include '../includes/header.php';
?>
<div class="row justify-content-center"><div class="col-md-5 mt-5">
    <div class="card shadow-sm"><div class="card-header bg-primary text-white"><h5>Staff Login</h5></div>
    <div class="card-body">
        <?php if(isset($error)) echo "<div class='alert alert-danger'>$error</div>"; ?>
        <form method="post">
            <?php csrf_field(); ?>
            <div class="mb-3"><label>Email</label><input type="email" name="email" class="form-control" required></div>
            <div class="mb-3"><label>Password</label><input type="password" name="password" class="form-control" required></div>
            <button class="btn btn-primary w-100">Login</button>
            <div class="mt-3 text-center"><small><a href="register.php">Need an account? Register</a></small></div>
        </form>
    </div></div>
</div></div>
<?php include '../includes/footer.php'; ?>