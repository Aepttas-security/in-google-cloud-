if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "/home/sivadharshan1755/.gradle/caches/9.3.1/transforms/88b7305a7dcfdc8d5ef6c5edd95347a6/transformed/hermes-android-250829098.0.14-release/prefab/modules/hermesvm/libs/android.arm64-v8a/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "/home/sivadharshan1755/.gradle/caches/9.3.1/transforms/88b7305a7dcfdc8d5ef6c5edd95347a6/transformed/hermes-android-250829098.0.14-release/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

