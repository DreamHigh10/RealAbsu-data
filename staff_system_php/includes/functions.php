<?php
function require_admin() {
    if(empty($_SESSION['admin_id'])) {
        header("Location: /staff_system_php/admin/login.php"); exit;
    }
}
function require_staff() {
    if(empty($_SESSION['staff_id'])) {
        header("Location: /staff_system_php/staff/login.php"); exit;
    }
}
function csrf_field() {
    if(empty($_SESSION['csrf_token'])) $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    echo '<input type="hidden" name="csrf_token" value="'.$_SESSION['csrf_token'].'">';
}
function verify_csrf() {
    if(!isset($_POST['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $_POST['csrf_token'])) {
        die("CSRF validation failed.");
    }
}
function sanitize($str) { return htmlspecialchars(strip_tags(trim($str)), ENT_QUOTES, 'UTF-8'); }
?>