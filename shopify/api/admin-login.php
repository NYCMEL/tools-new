<?php
header('Content-Type: application/json');
$input = json_decode(file_get_contents('php://input'), true);
if (($input['username'] ?? '') === 'admin' && ($input['password'] ?? '') === 'test') {
    echo json_encode(['ok' => true]);
    exit;
}
http_response_code(401);
echo json_encode(['ok' => false, 'message' => 'Invalid login']);
