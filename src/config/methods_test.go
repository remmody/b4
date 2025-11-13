package config

import "testing"

func TestValidation(t *testing.T) {

	cfg := &DefaultConfig
	err := cfg.Validate()
	if err != nil {
		t.Fatalf("expected no validation errors, got: %v", err)
	}

	if cfg.MainSet == nil {
		t.Fatal("expected MainSet to be initialized, got nil")
	}

	if cfg.MainSet.Id != MAIN_SET_ID {
		t.Fatalf("expected MainSet.Id to be %s, got %s", MAIN_SET_ID, cfg.MainSet.Id)
	}

}

func TestResetToDefaults(t *testing.T) {
	setId := "custom_set"

	cfg := &Config{
		Sets: []*SetConfig{&DefaultSetConfig,
			{
				Id: setId,
				Targets: TargetsConfig{
					SNIDomains: []string{"example.test"},
				},
				Fragmentation: FragmentationConfig{
					SNIPosition: 5,
				},
			},
		},
	}

	cfg.Validate()

	for _, set := range cfg.Sets {

		set.ResetToDefaults()
	}

	if cfg.MainSet.Id != MAIN_SET_ID {
		t.Fatalf("expected MainSet.Id to be %s, got %s", MAIN_SET_ID, cfg.MainSet.Id)
	}

	if len(cfg.Sets) != 2 {
		t.Fatalf("expected 2 sets, got %d", len(cfg.Sets))
	}

	if cfg.Sets[1].Id != setId {
		t.Fatalf("expected second set Id to be %s, got %s", setId, cfg.Sets[1].Id)
	}

	if len(cfg.Sets[1].Targets.SNIDomains) != 1 || cfg.Sets[1].Targets.SNIDomains[0] != "example.test" {
		t.Fatalf("expected second set SNIDomains to be [example.test], got %v", cfg.Sets[1].Targets.SNIDomains)
	}

	if cfg.Sets[1].Fragmentation.SNIPosition != 1 {
		t.Fatalf("expected second set SNIPosition to be 5, got %d", cfg.Sets[1].Fragmentation.SNIPosition)
	}

}
