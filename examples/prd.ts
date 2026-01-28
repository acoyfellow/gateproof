#!/usr/bin/env bun
/**
 * Agent-First PRD Examples
 *
 * These examples are designed for AI coding agents, not humans.
 * Each example focuses on what makes coding agents effective:
 * - Deterministic outcomes with clear success criteria
 * - Parallelizable operations
 * - Comprehensive edge case coverage
 * - Automated testing strategies
 * - Error recovery procedures
 * - Safety guarantees and rollback plans
 */

import { definePrd, runPrd } from "../src/prd/index";

const agentFirstExampleBlueprints = [
    {
      name: "convert_callbacks_to_promises",
      description: "Convert entire codebase from callback patterns to async/await",
      complexity: "high",
      agent_benefits: {
        parallelizable: true,
        deterministic_outcomes: true,
        testable: true,
        error_recovery: true
      },
      success_criteria: [
        "100% of callbacks converted",
        "No callback hell patterns remain",
        "All tests pass after conversion",
        "TypeScript types inferred correctly"
      ],
      edges_cases: [
        "Nested callbacks with error handling",
        "Mixed promise/callback patterns",
        "Event emitter patterns",
        "Third-party library callbacks"
      ]
    },
    {
      name: "fix_memory_leak_in_worker",
      description: "Identify and fix memory leak in background worker processing",
      complexity: "medium",
      agent_benefits: {
        systematic_approach: true,
        pattern_recognition: true,
        automated_testing: true,
        isolation: true
      },
      debugging_strategy: [
        "Profile memory usage over time",
        "Test with increasing workloads",
        "Isolate specific worker operations",
        "Verify garbage collection triggers",
        "Compare before/after snapshots"
      ],
      success_criteria: [
        "Memory usage stabilizes after N operations",
        "No increasing memory trends in 24h run",
        "All worker operations complete without leaks",
        "Memory allocations properly garbage collected"
      ]
    },
    {
      name: "design_payment_api",
      description: "Create comprehensive payment processing API",
      complexity: "high",
      agent_benefits: {
        completeness: true,
        consistency: true,
        documentation_autogen: true,
        versioning: true
      },
      api_design_patterns: {
        authentication: "JWT with refresh tokens",
        ratelimiting: "token bucket algorithm",
        idempotency: "request-level deduplication",
        error_handling: "consistent error envelopes",
        response_formatting: "standardized schemas"
      },
      must_cover: [
        "Payment success/failure states",
        "Webhook deliverability",
        "Refund processing",
        "Partial payments",
        "Currency conversions",
        "fraud detection integration",
        "Compliance logging",
        "Reconciliation reports"
      ]
    },
    {
      name: "harden_authentication_flow",
      description: "Implement comprehensive security improvements to auth system",
      complexity: "high",
      agent_benefits: {
        threat_modeling: true,
        compliance_checking: true,
        automated_scanning: true,
        vulnerability_testing: true
      },
      security_components: [
        "Rate limiting per user/IP",
        "Account lockout after failed attempts",
        "Session management with secure cookies",
        "CSRF protection for all state-changing ops",
        "Input validation on all endpoints",
        "SQL injection prevention",
        "XSS protection in all UI",
        "Security headers (CSP, HSTS, etc.)"
      ],
      attack_vectors_to_test: [
        "Brute force authentication",
        "Session fixation",
        "CSRF attacks",
        "XSS payloads",
        "SQL injection attempts",
        "Replay attacks",
        "Man-in-the-middle scenarios"
      ]
    },
    {
      name: "optimize_database_queries",
      description: "Identify and fix slow database queries across application",
      complexity: "medium",
      agent_benefits: {
        systematic_profiling: true,
        pattern_optimization: true,
        incremental_testing: true,
        benchmark_comparison: true
      },
      optimization_strategies: [
        "Add database indexes",
        "Use query result caching",
        "Implement query pagination",
        "Avoid N+1 query patterns",
        "Use batch operations",
        "Denormalize read-heavy data",
        "Connection pooling optimization"
      ],
      success_metrics: [
        "90th percentile query latency < 100ms",
        "99th percentile query latency < 500ms",
        "Database CPU utilization < 70%",
        "Query execution plan optimization",
        "Memory usage per connection stable"
      ]
    },
    {
      name: "generate_comprehensive_tests",
      description: "Create full test suite for payment processing module",
      complexity: "high",
      agent_benefits: {
        exhaustive_coverage: true,
        automated_generation: true,
        mutation_testing: true,
        parallel_execution: true
      },
      test_categories: [
        "Unit tests for all functions",
        "Integration tests for API endpoints",
        "Error handling scenarios",
        "Edge cases and boundary conditions",
        "Performance benchmarks",
        "Security test cases",
        "Load testing scenarios"
      ],
      must_test: [
        "Happy path for all operations",
        "Error responses for invalid inputs",
        "Timeout handling",
        "Concurrent operation conflicts",
        "Resource cleanup",
        "State persistence",
        "Data validation",
        "Error recovery"
      ]
    },
    {
      name: "implement_service_communication",
      description: "Create inter-service communication with contract testing",
      complexity: "high",
      agent_benefits: {
        contract_testing: true,
        service_discovery: true,
        circuit_breaker: true,
        observability: true
      },
      communication_patterns: {
        synchronous: "HTTP/REST with circuit breakers",
        asynchronous: "message queues with dead letter",
        service_discovery: "etcd-based registry",
        load_balancing: "consistent hashing",
        retry_logic: "exponential backoff",
        timeout_handling: "per-operation timeouts"
      },
      must_implement: [
        "Service contract definitions",
        "Automated contract testing",
        "Service health checks",
        "Load balancer integration",
        "Circuit breaker patterns",
        "Distributed tracing",
        "Metrics collection",
        "Error aggregation"
      ]
    },
    {
      name: "migrate_to_new_database",
      description: "Migrate data from old database schema to new schema",
      complexity: "high",
      agent_benefits: {
        data_integrity: true,
        rollback_procedures: true,
        parallel_migration: true,
        validation_testing: true
      },
      migration_phases: [
        "Phase 1: Create new schema",
        "Phase 2: Copy data with transformations",
        "Phase 3: Validate data integrity",
        "Phase 4: Switch read/write operations",
        "Phase 5: Remove old schema"
      ],
      safety_measures: [
        "Atomic transactions for each batch",
        "Data validation at each phase",
        "Rollback capability at each phase",
        "Monitoring for data inconsistencies",
        "Fallback to old system on errors",
        "Data backup before migration"
      ]
    },
    {
      name: "modernize_legacy_code",
      description: "Modernize legacy codebase with systematic refactoring",
      complexity: "high",
      agent_benefits: {
        pattern_recognition: true,
        systematic_refactoring: true,
        test_preservation: true,
        consistency_enforcement: true
      },
      modernization_focus: [
        "Convert to async/await patterns",
        "Add TypeScript types",
        "Remove deprecated APIs",
        "Implement proper error handling",
        "Add comprehensive logging",
        "Improve test coverage",
        "Update dependencies",
        "Apply modern design patterns"
      ],
      quality_improvements: [
        "Code complexity reduction",
        "Maintainability improvements",
        "Performance optimizations",
        "Security enhancements",
        "Documentation updates"
      ]
    },
    {
      name: "implement_rate_limiting",
      description: "Implement distributed rate limiting system",
      complexity: "medium",
      agent_benefits: {
        mathematical_precision: true,
        distributed_coordination: true,
        fault_tolerance: true,
        metrics_collection: true
      },
      rate_limiting_strategy: {
        algorithm: "token bucket",
        backend: "redis",
        distributed_locking: true,
        window_sliding: true
      },
      implementation_requirements: [
        "Per-user rate limits",
        "Per-IP rate limits",
        "API endpoint specific limits",
        "Burst allowance",
        "Steady state enforcement",
        "Graceful degradation",
        "Monitoring and alerts",
        "User feedback"
      ]
    },
    {
      name: "implement_observability",
      description: "Create comprehensive observability platform",
      complexity: "high",
      agent_benefits: {
        comprehensive_instrumentation: true,
        structured_logging: true,
        context_propagation: true,
        automated_alerting: true
      },
      observability_components: [
        "Structured logging with correlation IDs",
        "Distributed tracing across services",
        "Metrics collection for all operations",
        "Error tracking and aggregation",
        "Performance profiling",
        "Custom dashboards",
        "Automated anomaly detection",
        "Integration with incident response"
      ],
      logging_standards: {
        format: "structured JSON",
        fields: ["timestamp", "level", "service", "trace_id", "operation", "status"],
        correlation: true,
        sampling: "adaptive"
      }
    },
    {
      name: "implement_event_driven_architecture",
      description: "Implement event-driven architecture with event sourcing",
      complexity: "high",
      agent_benefits: {
        message_orchestration: true,
        event_consistency: true,
        replay_capability: true,
        temporal_patterns: true
      },
      architecture_components: [
        "Event definitions and schemas",
        "Event producers and consumers",
        "Message broker integration",
        "Event store with replay",
        "Projection generation",
        "Event versioning strategy",
        "Dead letter handling",
        "Monitoring and observability"
      ],
      event_patterns: [
        "Command events",
        "Domain events",
        "Integration events",
        "Snapshot events",
        "Compensation events"
      ]
    }
  ];

export const agentFirstExamples = definePrd({
  stories: [
    {
      id: "production-gates-2026-01-27",
      title: "Documented production gate status before troubleshooting further",
      gateFile: "gates/production/smoke.gate.ts",
      progress: [
        "Smoke gate (homepage, /api/health, /api/test) passed against https://gateproof.dev with all assertions green.",
        "Sandbox diagnose gate hit /api/prd/run/diagnose and returned a 500 (Container provisioning issue: SandboxError HTTP error! status: 500), so assertion sandbox_diagnose_ok failed.",
        "Sandbox provisioning fix gate could not heal the sandbox: the diagnose request and the sandbox run request both timed out, so sandbox_diagnose_fixed and sandbox_run_sse_fixed stayed failed.",
        "Sandbox run gate (/api/prd/run) timed out as well, leaving sandbox_run_sse_completes failing and blocking the sandbox flow."
      ]
    }
  ]
}); // This file is for examples only, no executable stories

if (import.meta.main) {
  console.log("📚 Agent-First PRD Examples loaded");
  console.log("📖 These examples show what makes PRDs compelling for AI coding agents");
  console.log("\n🎯 Key Agent Benefits:");
  console.log("  - Deterministic outcomes with clear success criteria");
  console.log("  - Parallelizable operations");
  console.log("  - Comprehensive edge case coverage");
  console.log("  - Automated testing strategies");
  console.log("  - Error recovery procedures");
  console.log("  - Safety guarantees and rollback plans");
}
