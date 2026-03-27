              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Save Button */}
        <View className="mt-8 px-6">
          <TouchableOpacity 
            onPress={handleSave}
            className="bg-[#3A3A3A] h-16 rounded-[32px] items-center justify-center shadow-lg"
          >
            <Text className="text-white font-bold text-[18px]">Save Drawing</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
