<?php
require_once '../config/database.php';
require_once '../includes/functions.php';

if($_SERVER['REQUEST_METHOD'] == 'POST'){
    verify_csrf();
    $id_num = sanitize($_POST['staff_id_number']);
    $email = sanitize($_POST['email']);
    $pass = password_hash($_POST['password'], PASSWORD_DEFAULT);
    
    $stmt = $pdo->prepare("SELECT id FROM staff WHERE email=? OR staff_id_number=?");
    $stmt->execute([$email, $id_num]);
    if($stmt->fetch()) {
        $error = "Email or Staff ID already exists.";
    } else {
        $pdo->prepare("INSERT INTO staff (staff_id_number, email, password_hash, status) VALUES (?,?,?, 'pending')")
            ->execute([$id_num, $email, $pass]);
        $success = "Registration successful! Please wait for Admin approval before logging in.";
    }
}
include '../includes/header.php';
?>
<div class="row justify-content-center"><div class="col-md-5 mt-5">
    <div class="card shadow-sm"><div class="card-header bg-primary text-white"><h5>Staff Registration</h5></div>
    <div class="card-body">
        <?php if(isset($error)) echo "<div class='alert alert-danger'>$error</div>"; ?>
        <?php if(isset($success)): ?>
            <div class='alert alert-success'><?= $success ?></div>
            <a href="login.php" class="btn btn-primary w-100">Go to Login</a>
        <?php else: ?>
            <form method="post">
                <?php csrf_field(); ?>
                <div class="mb-3"><label>Staff ID Number</label><input type="text" name="staff_id_number" class="form-control" required></div>
                <div class="mb-3"><label>Email Address</label><input type="email" name="email" class="form-control" required></div>
                <div class="mb-3"><label>Password</label><input type="password" name="password" class="form-control" required minlength="6"></div>
                <button class="btn btn-primary w-100">Register</button>
                <div class="mt-3 text-center"><small><a href="login.php">Already have an account? Login</a></small></div>
            </form>
        <?php endif; ?>
    </div></div>
</div></div>
<?php include '../includes/footer.php'; ?>