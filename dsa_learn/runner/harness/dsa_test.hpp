#pragma once

#include <chrono>
#include <cstdlib>
#include <functional>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

namespace dsa {

struct TestFailure {
    std::string test_name;
    std::string expected;
    std::string actual;
    std::string message;
    std::string file;
    int line;
};

struct TestResult {
    std::string tier;
    std::string component;
    std::string name;
    bool passed;
    long long duration_us;
    std::string expected;
    std::string actual;
    std::string failure_message;
};

class TestContext {
public:
    bool current_test_failed = false;
    std::string current_test_name;
    std::string current_tier;
    std::string current_component;
    TestFailure failure_details;

    void fail(const std::string& expected, const std::string& actual,
              const std::string& msg, const char* file, int line) {
        if (!current_test_failed) {
            current_test_failed = true;
            failure_details = {current_test_name, expected, actual, msg, file, line};
        }
    }
};

inline TestContext& get_context() {
    static TestContext ctx;
    return ctx;
}

class TestRegistry {
public:
    struct TestCase {
        std::string tier;
        std::string component;
        std::string name;
        std::function<void()> func;
    };

    static std::vector<TestCase>& get_tests() {
        static std::vector<TestCase> tests;
        return tests;
    }

    static void add_test(const std::string& tier, const std::string& component, const std::string& name, std::function<void()> func) {
        get_tests().push_back({tier, component, name, func});
    }

    static void add_test(const std::string& tier, const std::string& name, std::function<void()> func) {
        get_tests().push_back({tier, "", name, func});
    }
};

struct AutoRegister {
    AutoRegister(const std::string& tier, const std::string& component, const std::string& name, std::function<void()> func) {
        TestRegistry::add_test(tier, component, name, func);
    }
    AutoRegister(const std::string& tier, const std::string& name, std::function<void()> func) {
        TestRegistry::add_test(tier, "", name, func);
    }
};

// Helper string conversions
template <typename T>
std::string to_string_repr(const T& val) {
    std::ostringstream oss;
    oss << val;
    return oss.str();
}

inline std::string to_string_repr(bool val) {
    return val ? "true" : "false";
}

inline std::string to_string_repr(const std::string& val) {
    return "\"" + val + "\"";
}

template <typename T>
std::string to_string_repr(const std::vector<T>& vec) {
    std::ostringstream oss;
    oss << "[";
    for (size_t i = 0; i < vec.size(); ++i) {
        if (i > 0) oss << ", ";
        oss << to_string_repr(vec[i]);
    }
    oss << "]";
    return oss.str();
}

inline std::string escape_json(const std::string& s) {
    std::ostringstream o;
    for (char c : s) {
        switch (c) {
            case '"': o << "\\\""; break;
            case '\\': o << "\\\\"; break;
            case '\b': o << "\\b"; break;
            case '\f': o << "\\f"; break;
            case '\n': o << "\\n"; break;
            case '\r': o << "\\r"; break;
            case '\t': o << "\\t"; break;
            default:
                if (static_cast<unsigned char>(c) <= 0x1f) {
                    o << "\\u" << std::hex << std::setw(4) << std::setfill('0') << static_cast<int>(c);
                } else {
                    o << c;
                }
        }
    }
    return o.str();
}

} // namespace dsa

#define CONCAT_INNER(a, b) a##b
#define CONCAT(a, b) CONCAT_INNER(a, b)

#define TEST_CASE_TIER(tier_name, test_title) \
    void CONCAT(test_func_, __LINE__)(); \
    static dsa::AutoRegister CONCAT(reg_, __LINE__)(tier_name, test_title, CONCAT(test_func_, __LINE__)); \
    void CONCAT(test_func_, __LINE__)()

#define TEST_FUNCTIONAL(name) TEST_CASE_TIER("Functional Correctness", name)
#define TEST_BOUNDARY(name)   TEST_CASE_TIER("Boundary & Edge Cases", name)
#define TEST_COMPLEXITY(name) TEST_CASE_TIER("Complexity & Resource Limits", name)

#define TEST_FOUNDATION(component_name, test_title) \
    void CONCAT(test_func_, __LINE__)(); \
    static dsa::AutoRegister CONCAT(reg_, __LINE__)("Foundation", component_name, test_title, CONCAT(test_func_, __LINE__)); \
    void CONCAT(test_func_, __LINE__)()

#define ASSERT_EQ(actual, expected) \
    do { \
        auto&& _act = (actual); \
        auto&& _exp = (expected); \
        if (!(_act == _exp)) { \
            dsa::get_context().fail( \
                dsa::to_string_repr(_exp), \
                dsa::to_string_repr(_act), \
                "Equality assertion failed", \
                __FILE__, __LINE__ \
            ); \
            return; \
        } \
    } while (0)

#define ASSERT_TRUE(condition) \
    do { \
        if (!(condition)) { \
            dsa::get_context().fail("true", "false", "Condition asserted to be true was false", __FILE__, __LINE__); \
            return; \
        } \
    } while (0)

#define ASSERT_FALSE(condition) \
    do { \
        if (condition) { \
            dsa::get_context().fail("false", "true", "Condition asserted to be false was true", __FILE__, __LINE__); \
            return; \
        } \
    } while (0)

inline int run_dsa_test_runner(int argc, char* argv[]) {
    bool json_output = false;
    for (int i = 1; i < argc; ++i) {
        if (std::string(argv[i]) == "--json") {
            json_output = true;
        }
    }

    auto& tests = dsa::TestRegistry::get_tests();
    std::vector<dsa::TestResult> results;
    int total_passed = 0;
    int total_failed = 0;

    for (auto& tc : tests) {
        auto& ctx = dsa::get_context();
        ctx.current_test_failed = false;
        ctx.current_test_name = tc.name;
        ctx.current_tier = tc.tier;
        ctx.current_component = tc.component;
        ctx.failure_details = {};

        auto start = std::chrono::high_resolution_clock::now();
        try {
            tc.func();
        } catch (const std::exception& e) {
            ctx.fail("Normal execution", "Exception", e.what(), __FILE__, __LINE__);
        } catch (...) {
            ctx.fail("Normal execution", "Unknown Exception", "Caught non-std exception", __FILE__, __LINE__);
        }
        auto end = std::chrono::high_resolution_clock::now();
        long long duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start).count();

        if (ctx.current_test_failed) {
            total_failed++;
            results.push_back({
                tc.tier,
                tc.component,
                tc.name,
                false,
                duration,
                ctx.failure_details.expected,
                ctx.failure_details.actual,
                ctx.failure_details.message
            });
        } else {
            total_passed++;
            results.push_back({tc.tier, tc.component, tc.name, true, duration, "", "", ""});
        }
    }

    if (json_output) {
        std::cout << "{\n";
        std::cout << "  \"summary\": {\n";
        std::cout << "    \"total\": " << tests.size() << ",\n";
        std::cout << "    \"passed\": " << total_passed << ",\n";
        std::cout << "    \"failed\": " << total_failed << ",\n";
        std::cout << "    \"skipped\": 0\n";
        std::cout << "  },\n";
        std::cout << "  \"tests\": [\n";
        for (size_t i = 0; i < results.size(); ++i) {
            const auto& r = results[i];
            std::cout << "    {\n";
            std::cout << "      \"tier\": \"" << dsa::escape_json(r.tier) << "\",\n";
            if (!r.component.empty()) {
                std::cout << "      \"component\": \"" << dsa::escape_json(r.component) << "\",\n";
            }
            std::cout << "      \"name\": \"" << dsa::escape_json(r.name) << "\",\n";
            std::cout << "      \"passed\": " << (r.passed ? "true" : "false") << ",\n";
            std::cout << "      \"duration_us\": " << r.duration_us << ",\n";
            std::cout << "      \"expected\": \"" << dsa::escape_json(r.expected) << "\",\n";
            std::cout << "      \"actual\": \"" << dsa::escape_json(r.actual) << "\",\n";
            std::cout << "      \"failure_message\": \"" << dsa::escape_json(r.failure_message) << "\"\n";
            std::cout << "    }" << (i + 1 < results.size() ? "," : "") << "\n";
        }
        std::cout << "  ]\n";
        std::cout << "}\n";
    } else {
        std::cout << "\n================ DSA TEST RUNNER ================\n";
        std::string current_tier = "";
        for (const auto& r : results) {
            if (r.tier != current_tier) {
                current_tier = r.tier;
                std::cout << "\n[" << current_tier << "]\n";
            }
            std::string prefix = r.component.empty() ? "" : ("[" + r.component + "] ");
            if (r.passed) {
                std::cout << "  [✓] " << prefix << r.name << " (" << r.duration_us << " µs)\n";
            } else {
                std::cout << "  [✗] " << prefix << r.name << " (FAILED)\n";
                std::cout << "      Expected: " << r.expected << "\n";
                std::cout << "      Actual:   " << r.actual << "\n";
                if (!r.failure_message.empty()) {
                    std::cout << "      Message:  " << r.failure_message << "\n";
                }
            }
        }
        std::cout << "\n-------------------------------------------------\n";
        std::cout << "Total: " << tests.size()
                  << " | Passed: " << total_passed
                  << " | Failed: " << total_failed << "\n";
        std::cout << "=================================================\n\n";
    }

    return total_failed == 0 ? 0 : 1;
}

#ifndef DSA_NO_MAIN
int main(int argc, char* argv[]) {
    return run_dsa_test_runner(argc, argv);
}
#endif
