import { execSync } from "child_process";

// Seed script for local development — all values are hardcoded constants.
// Uses execSync to shell out to wrangler for D1 local database seeding.

const now = Math.floor(Date.now() / 1000);

function sql(query: string) {
  execSync(`wrangler d1 execute DB --local --command "${query.replace(/"/g, '\\"')}"`, {
    cwd: import.meta.dirname ? import.meta.dirname + "/.." : process.cwd(),
    stdio: "inherit",
  });
}

console.log("Seeding database...\n");

// 1. User
sql(`INSERT OR REPLACE INTO users (id, email, username, display_name, email_verified, created_at, updated_at) VALUES ('seed-user-001', 'demo@skvault.dev', 'skvault', 'SKVault Demo', 1, ${now}, ${now})`);
console.log("✓ User: skvault (seed-user-001)");

// 2. Skills
sql(`INSERT OR REPLACE INTO skills (id, owner_id, name, description, visibility, download_count, created_at, updated_at) VALUES ('skill-001', 'seed-user-001', 'code-review', 'Automated code review with contextual feedback', 'public', 142, ${now}, ${now})`);
sql(`INSERT OR REPLACE INTO skills (id, owner_id, name, description, visibility, download_count, created_at, updated_at) VALUES ('skill-002', 'seed-user-001', 'test-generator', 'Generate unit and integration tests from source', 'public', 87, ${now}, ${now})`);
sql(`INSERT OR REPLACE INTO skills (id, owner_id, name, description, visibility, download_count, created_at, updated_at) VALUES ('skill-003', 'seed-user-001', 'doc-writer', 'Generate documentation from code and comments', 'private', 23, ${now}, ${now})`);
console.log("✓ Skills: code-review, test-generator, doc-writer");

// 3. Skill versions
sql(`INSERT OR REPLACE INTO skill_versions (id, skill_id, version, version_major, version_minor, version_patch, content_hash, tarball_key, skill_md_content, file_count, total_size_bytes, status, published_by, created_at) VALUES ('ver-001', 'skill-001', '1.2.0', 1, 2, 0, 'sha256:abc001', 'skills/skvault/code-review/1.2.0.tar.gz', '# Code Review\nAutomated code review skill.', 5, 12400, 'active', 'seed-user-001', ${now})`);
sql(`INSERT OR REPLACE INTO skill_versions (id, skill_id, version, version_major, version_minor, version_patch, content_hash, tarball_key, skill_md_content, file_count, total_size_bytes, status, published_by, created_at) VALUES ('ver-002', 'skill-002', '1.0.0', 1, 0, 0, 'sha256:abc002', 'skills/skvault/test-generator/1.0.0.tar.gz', '# Test Generator\nGenerate tests automatically.', 3, 8200, 'active', 'seed-user-001', ${now})`);
sql(`INSERT OR REPLACE INTO skill_versions (id, skill_id, version, version_major, version_minor, version_patch, content_hash, tarball_key, skill_md_content, file_count, total_size_bytes, status, published_by, created_at) VALUES ('ver-003', 'skill-003', '0.3.1', 0, 3, 1, 'sha256:abc003', 'skills/skvault/doc-writer/0.3.1.tar.gz', '# Doc Writer\nGenerate documentation.', 4, 9600, 'active', 'seed-user-001', ${now})`);
console.log("✓ Versions: 1.2.0, 1.0.0, 0.3.1");

// 4. Scan results
sql(`INSERT OR REPLACE INTO scan_results (id, skill_version_id, engine_version, status, secrets_status, permissions_status, network_status, filesystem_status, overall_status, created_at) VALUES ('scan-001', 'ver-001', '0.1.0', 'completed', 'pass', 'pass', 'pass', 'pass', 'pass', ${now})`);
sql(`INSERT OR REPLACE INTO scan_results (id, skill_version_id, engine_version, status, secrets_status, permissions_status, network_status, filesystem_status, overall_status, created_at) VALUES ('scan-002', 'ver-002', '0.1.0', 'completed', 'pass', 'warn', 'pass', 'pass', 'warn', ${now})`);
sql(`INSERT OR REPLACE INTO scan_results (id, skill_version_id, engine_version, status, secrets_status, permissions_status, network_status, filesystem_status, overall_status, created_at) VALUES ('scan-003', 'ver-003', '0.1.0', 'completed', 'pass', 'pass', 'pass', 'pass', 'pass', ${now})`);
console.log("✓ Scan results: pass, warn, pass");

console.log("\nSeed complete!");
